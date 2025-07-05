import express from 'express';
import { prisma, broadcastUpdate } from '../server';
import { logger } from '../utils/logger';
import { maintenanceSchema } from '../utils/validators';
import { requireAdminOrStaff, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all maintenance schedules
router.get('/', async (req: AuthRequest, res) => {
  try {
    const {
      itemId,
      technicianId,
      type,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    const where: any = {};

    if (itemId) where.itemId = itemId;
    if (technicianId) where.technicianId = technicianId;
    if (type) where.maintenanceType = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate as string);
      if (endDate) where.scheduledDate.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [maintenanceSchedules, total] = await Promise.all([
      prisma.maintenanceSchedule.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              serialNumber: true,
              manufacturer: true,
              model: true,
              category: {
                select: {
                  name: true,
                  color: true
                }
              }
            }
          },
          technician: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true
            }
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          scheduledDate: 'desc'
        },
        skip,
        take,
      }),
      prisma.maintenanceSchedule.count({ where })
    ]);

    res.json({
      maintenanceSchedules,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching maintenance schedules:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance schedules' });
  }
});

// Get maintenance schedule by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const maintenance = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            category: true,
            transactions: {
              where: {
                transactionType: 'maintenance'
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 5
            }
          }
        },
        technician: true,
        creator: true
      }
    });

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }

    res.json(maintenance);
  } catch (error) {
    logger.error('Error fetching maintenance schedule:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance schedule' });
  }
});

// Create new maintenance schedule (admin/staff only)
router.post('/', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const validatedData = maintenanceSchema.parse(req.body);
    const currentUser = req.user!;

    // Verify item exists
    const item = await prisma.inventoryItem.findUnique({
      where: { id: validatedData.itemId }
    });

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Verify technician exists if provided
    if (validatedData.technicianId) {
      const technician = await prisma.userProfile.findUnique({
        where: { id: validatedData.technicianId }
      });

      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }
    }

    const maintenance = await prisma.maintenanceSchedule.create({
      data: {
        ...validatedData,
        scheduledDate: new Date(validatedData.scheduledDate),
        createdBy: currentUser.id
      },
      include: {
        item: {
          include: {
            category: true
          }
        },
        technician: true,
        creator: true
      }
    });

    logger.info(`Maintenance scheduled: ${item.name} - ${validatedData.maintenanceType}`);
    broadcastUpdate('maintenance_created', maintenance);

    res.status(201).json(maintenance);
  } catch (error: any) {
    logger.error('Error creating maintenance schedule:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({ error: 'Failed to create maintenance schedule' });
  }
});

// Update maintenance schedule (admin/staff only)
router.put('/:id', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = maintenanceSchema.parse(req.body);

    const maintenance = await prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        ...validatedData,
        scheduledDate: new Date(validatedData.scheduledDate)
      },
      include: {
        item: {
          include: {
            category: true
          }
        },
        technician: true,
        creator: true
      }
    });

    logger.info(`Maintenance updated: ${id}`);
    broadcastUpdate('maintenance_updated', maintenance);

    res.json(maintenance);
  } catch (error: any) {
    logger.error('Error updating maintenance schedule:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }

    res.status(500).json({ error: 'Failed to update maintenance schedule' });
  }
});

// Update maintenance status
router.patch('/:id/status', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, completedDate, cost, notes, nextMaintenanceDate } = req.body;

    const updateData: any = { status };
    
    if (completedDate) updateData.completedDate = new Date(completedDate);
    if (cost !== undefined) updateData.cost = cost;
    if (notes !== undefined) updateData.notes = notes;
    if (nextMaintenanceDate) updateData.nextMaintenanceDate = new Date(nextMaintenanceDate);

    const maintenance = await prisma.maintenanceSchedule.update({
      where: { id },
      data: updateData,
      include: {
        item: {
          include: {
            category: true
          }
        },
        technician: true
      }
    });

    // If completed, update item's maintenance dates
    if (status === 'completed' && maintenance.item) {
      await prisma.inventoryItem.update({
        where: { id: maintenance.itemId },
        data: {
          lastMaintenance: completedDate ? new Date(completedDate) : new Date(),
          nextMaintenance: nextMaintenanceDate ? new Date(nextMaintenanceDate) : null
        }
      });
    }

    logger.info(`Maintenance status updated: ${id} - ${status}`);
    broadcastUpdate('maintenance_updated', maintenance);

    res.json(maintenance);
  } catch (error: any) {
    logger.error('Error updating maintenance status:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }

    res.status(500).json({ error: 'Failed to update maintenance status' });
  }
});

// Delete maintenance schedule (admin/staff only)
router.delete('/:id', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.maintenanceSchedule.delete({
      where: { id }
    });

    logger.info(`Maintenance schedule deleted: ${id}`);
    broadcastUpdate('maintenance_deleted', { id });

    res.json({ message: 'Maintenance schedule deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting maintenance schedule:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }

    res.status(500).json({ error: 'Failed to delete maintenance schedule' });
  }
});

// Get upcoming maintenance
router.get('/upcoming/list', async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const daysAhead = parseInt(days as string);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const upcomingMaintenance = await prisma.maintenanceSchedule.findMany({
      where: {
        status: { in: ['scheduled', 'in_progress'] },
        scheduledDate: {
          gte: new Date(),
          lte: endDate
        }
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            location: true,
            category: {
              select: {
                name: true,
                color: true
              }
            }
          }
        },
        technician: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });

    res.json(upcomingMaintenance);
  } catch (error) {
    logger.error('Error fetching upcoming maintenance:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming maintenance' });
  }
});

// Get overdue maintenance
router.get('/overdue/list', async (req: AuthRequest, res) => {
  try {
    const overdueMaintenance = await prisma.maintenanceSchedule.findMany({
      where: {
        status: { in: ['scheduled', 'in_progress'] },
        scheduledDate: {
          lt: new Date()
        }
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            location: true,
            category: {
              select: {
                name: true,
                color: true
              }
            }
          }
        },
        technician: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });

    // Update status to overdue
    await prisma.maintenanceSchedule.updateMany({
      where: {
        status: { in: ['scheduled', 'in_progress'] },
        scheduledDate: {
          lt: new Date()
        }
      },
      data: {
        status: 'overdue'
      }
    });

    res.json(overdueMaintenance);
  } catch (error) {
    logger.error('Error fetching overdue maintenance:', error);
    res.status(500).json({ error: 'Failed to fetch overdue maintenance' });
  }
});

// Get maintenance statistics
router.get('/stats/overview', async (req: AuthRequest, res) => {
  try {
    const [
      totalScheduled,
      completedThisMonth,
      overdueCount,
      upcomingCount,
      byType,
      byStatus,
      totalCosts
    ] = await Promise.all([
      prisma.maintenanceSchedule.count(),
      prisma.maintenanceSchedule.count({
        where: {
          status: 'completed',
          completedDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.maintenanceSchedule.count({
        where: {
          status: { in: ['scheduled', 'in_progress'] },
          scheduledDate: { lt: new Date() }
        }
      }),
      prisma.maintenanceSchedule.count({
        where: {
          status: { in: ['scheduled', 'in_progress'] },
          scheduledDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.maintenanceSchedule.groupBy({
        by: ['maintenanceType'],
        _count: { id: true }
      }),
      prisma.maintenanceSchedule.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.maintenanceSchedule.aggregate({
        _sum: { cost: true },
        where: {
          status: 'completed',
          cost: { not: null }
        }
      })
    ]);

    const stats = {
      totalScheduled,
      completedThisMonth,
      overdueCount,
      upcomingCount,
      byType: byType.map(item => ({
        type: item.maintenanceType,
        count: item._count.id
      })),
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count.id
      })),
      totalCosts: totalCosts._sum.cost || 0
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching maintenance statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;