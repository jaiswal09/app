import express from 'express';
import { prisma, broadcastUpdate } from '../server';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all low stock alerts
router.get('/', async (req: AuthRequest, res) => {
  try {
    const {
      status = 'active',
      alertLevel,
      page = '1',
      limit = '50'
    } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (alertLevel) where.alertLevel = alertLevel;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [alerts, total] = await Promise.all([
      prisma.lowStockAlert.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              description: true,
              location: true,
              qrCode: true,
              category: {
                select: {
                  name: true,
                  color: true
                }
              }
            }
          },
          acknowledger: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: [
          { alertLevel: 'desc' }, // out_of_stock > critical > low
          { createdAt: 'desc' }
        ],
        skip,
        take,
      }),
      prisma.lowStockAlert.count({ where })
    ]);

    res.json({
      alerts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching low stock alerts:', error);
    res.status(500).json({ error: 'Failed to fetch low stock alerts' });
  }
});

// Get alert by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.lowStockAlert.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            category: true,
            transactions: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 5,
              include: {
                user: {
                  select: {
                    fullName: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        acknowledger: true
      }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    logger.error('Error fetching alert:', error);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

// Acknowledge alert
router.patch('/:id/acknowledge', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const alert = await prisma.lowStockAlert.update({
      where: { id },
      data: {
        status: 'acknowledged',
        acknowledgedBy: currentUser.id,
        acknowledgedAt: new Date()
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            currentQuantity: true,
            minQuantity: true
          }
        },
        acknowledger: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    logger.info(`Alert acknowledged: ${id} by ${currentUser.email}`);
    broadcastUpdate('alert_acknowledged', alert);

    res.json(alert);
  } catch (error: any) {
    logger.error('Error acknowledging alert:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Resolve alert (usually done automatically when stock is replenished)
router.patch('/:id/resolve', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.lowStockAlert.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date()
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            quantity: true,
            minQuantity: true
          }
        }
      }
    });

    logger.info(`Alert resolved: ${id}`);
    broadcastUpdate('alert_resolved', alert);

    res.json(alert);
  } catch (error: any) {
    logger.error('Error resolving alert:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Get critical alerts (out of stock and critical level)
router.get('/critical/list', async (req: AuthRequest, res) => {
  try {
    const criticalAlerts = await prisma.lowStockAlert.findMany({
      where: {
        status: 'active',
        alertLevel: { in: ['critical', 'out_of_stock'] }
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            location: true,
            qrCode: true,
            category: {
              select: {
                name: true,
                color: true
              }
            }
          }
        }
      },
      orderBy: [
        { alertLevel: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(criticalAlerts);
  } catch (error) {
    logger.error('Error fetching critical alerts:', error);
    res.status(500).json({ error: 'Failed to fetch critical alerts' });
  }
});

// Get alert statistics
router.get('/stats/overview', async (req: AuthRequest, res) => {
  try {
    const [
      totalActive,
      criticalCount,
      outOfStockCount,
      acknowledgedCount,
      resolvedThisWeek,
      byLevel
    ] = await Promise.all([
      prisma.lowStockAlert.count({
        where: { status: 'active' }
      }),
      prisma.lowStockAlert.count({
        where: {
          status: 'active',
          alertLevel: 'critical'
        }
      }),
      prisma.lowStockAlert.count({
        where: {
          status: 'active',
          alertLevel: 'out_of_stock'
        }
      }),
      prisma.lowStockAlert.count({
        where: { status: 'acknowledged' }
      }),
      prisma.lowStockAlert.count({
        where: {
          status: 'resolved',
          resolvedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.lowStockAlert.groupBy({
        by: ['alertLevel'],
        _count: { id: true },
        where: { status: 'active' }
      })
    ]);

    const stats = {
      totalActive,
      criticalCount,
      outOfStockCount,
      acknowledgedCount,
      resolvedThisWeek,
      byLevel: byLevel.map(item => ({
        level: item.alertLevel,
        count: item._count.id
      }))
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching alert statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Bulk acknowledge alerts
router.patch('/bulk/acknowledge', async (req: AuthRequest, res) => {
  try {
    const { alertIds } = req.body;
    const currentUser = req.user!;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'Invalid alert IDs' });
    }

    const result = await prisma.lowStockAlert.updateMany({
      where: {
        id: { in: alertIds },
        status: 'active'
      },
      data: {
        status: 'acknowledged',
        acknowledgedBy: currentUser.id,
        acknowledgedAt: new Date()
      }
    });

    logger.info(`Bulk acknowledged ${result.count} alerts by ${currentUser.email}`);
    broadcastUpdate('alerts_bulk_acknowledged', { count: result.count, userId: currentUser.id });

    res.json({ 
      message: `${result.count} alerts acknowledged successfully`,
      count: result.count
    });
  } catch (error) {
    logger.error('Error bulk acknowledging alerts:', error);
    res.status(500).json({ error: 'Failed to acknowledge alerts' });
  }
});

// Auto-check and create alerts for low stock items
router.post('/check/auto', async (req: AuthRequest, res) => {
  try {
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        quantity: { lte: prisma.inventoryItem.fields.minQuantity }
      }
    });

    let alertsCreated = 0;

    for (const item of lowStockItems) {
      const alertLevel = item.quantity === 0 ? 'out_of_stock' :
                        item.quantity <= item.minQuantity * 0.5 ? 'critical' : 'low';

      // Check if alert already exists
      const existingAlert = await prisma.lowStockAlert.findFirst({
        where: {
          itemId: item.id,
          status: 'active'
        }
      });

      if (!existingAlert) {
        await prisma.lowStockAlert.create({
          data: {
            itemId: item.id,
            currentQuantity: item.quantity,
            minQuantity: item.minQuantity,
            alertLevel,
            status: 'active'
          }
        });
        alertsCreated++;
      } else if (existingAlert.alertLevel !== alertLevel) {
        // Update alert level if it has changed
        await prisma.lowStockAlert.update({
          where: { id: existingAlert.id },
          data: {
            alertLevel,
            currentQuantity: item.quantity
          }
        });
      }
    }

    logger.info(`Auto-check completed: ${alertsCreated} new alerts created`);
    
    if (alertsCreated > 0) {
      broadcastUpdate('alerts_auto_created', { count: alertsCreated });
    }

    res.json({
      message: 'Alert check completed',
      alertsCreated,
      itemsChecked: lowStockItems.length
    });
  } catch (error) {
    logger.error('Error in auto alert check:', error);
    res.status(500).json({ error: 'Failed to check alerts' });
  }
});

export default router;