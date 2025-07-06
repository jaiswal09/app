import express from 'express';
import { prisma, broadcastUpdate } from '../server';
import { logger } from '../utils/logger';
import { inventoryItemSchema } from '../utils/validators';
import { generateUniqueQRCode } from '../utils/qrcode';
import { requireAdminOrStaff, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all inventory items
router.get('/', async (req: AuthRequest, res) => {
  try {
    const {
      category,
      status,
      type,
      location,
      search,
      lowStock,
      page = '1',
      limit = '50'
    } = req.query;

    const where: any = {};

    // Build filters
    if (category) where.categoryId = category;
    if (status) where.status = status;
    if (type) where.itemType = type;
    if (location) where.location = { contains: location as string, mode: 'insensitive' };
    if (lowStock === 'true') {
      where.quantity = { lte: prisma.inventoryItem.fields.minQuantity };
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { serialNumber: { contains: search as string, mode: 'insensitive' } }, // FIX: Changed serialNumber to camelCase
        { qrCode: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          category: true,
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            }
          },
          _count: {
            select: {
              transactions: true,
              maintenanceSchedules: true,
            }
          }
        },
        orderBy: {
          name: 'asc'
        },
        skip,
        take,
      }),
      prisma.inventoryItem.count({ where })
    ]);

    return res.json({
      items,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching inventory items:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Get inventory item by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        transactions: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        maintenanceSchedules: {
          include: {
            technician: {
              select: {
                id: true,
                fullName: true,
                email: true,
              }
            }
          },
          orderBy: {
            scheduledDate: 'desc'
          },
          take: 5
        },
        lowStockAlerts: {
          where: {
            status: 'active'
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    return res.json(item);
  } catch (error) {
    logger.error('Error fetching inventory item:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

// Create new inventory item (admin/staff only)
router.post('/', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const validatedData = inventoryItemSchema.parse(req.body);
    const currentUser = req.user!;

    // Generate unique QR code
    const existingQRCodes = await prisma.inventoryItem.findMany({
      select: { qrCode: true },
      where: { qrCode: { not: null } }
    });
    const qrCode = await generateUniqueQRCode(
      existingQRCodes.map(item => item.qrCode!).filter(Boolean)
    );

    const item = await prisma.inventoryItem.create({
      data: {
        ...validatedData,
        qrCode,
        createdBy: currentUser.id,
        // FIX: Convert date strings to Date objects
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        lastMaintenance: validatedData.lastMaintenance ? new Date(validatedData.lastMaintenance) : null,
        nextMaintenance: validatedData.nextMaintenance ? new Date(validatedData.nextMaintenance) : null,
        purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : null,
        warrantyExpiry: validatedData.warrantyExpiry ? new Date(validatedData.warrantyExpiry) : null,
      },
      include: {
        category: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        }
      }
    });

    // Check for low stock and create alert if needed
    if (item.quantity <= item.minQuantity) {
      await createLowStockAlert(item);
    }

    logger.info(`Inventory item created: ${item.name} (QR: ${item.qrCode})`);
    broadcastUpdate('inventory_created', item);

    return res.status(201).json(item);
  } catch (error: any) {
    logger.error('Error creating inventory item:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    return res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update inventory item (admin/staff only)
router.put('/:id', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = inventoryItemSchema.parse(req.body);

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...validatedData,
        // FIX: Convert date strings to Date objects
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        lastMaintenance: validatedData.lastMaintenance ? new Date(validatedData.lastMaintenance) : null,
        nextMaintenance: validatedData.nextMaintenance ? new Date(validatedData.nextMaintenance) : null,
        purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : null,
        warrantyExpiry: validatedData.warrantyExpiry ? new Date(validatedData.warrantyExpiry) : null,
      },
      include: {
        category: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        }
      }
    });

    // Check for low stock changes
    if (existingItem.quantity > existingItem.minQuantity && item.quantity <= item.minQuantity) {
      await createLowStockAlert(item);
    } else if (existingItem.quantity <= existingItem.minQuantity && item.quantity > item.minQuantity) {
      await resolveLowStockAlert(item.id);
    }

    logger.info(`Inventory item updated: ${item.name}`);
    broadcastUpdate('inventory_updated', item);

    return res.json(item);
  } catch (error: any) {
    logger.error('Error updating inventory item:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    return res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete inventory item (admin/staff only)
router.delete('/:id', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check for active transactions
    const activeTransactions = await prisma.transaction.count({
      where: {
        itemId: id,
        status: { in: ['active', 'overdue'] }
      }
    });

    if (activeTransactions > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete item with active transactions',
        details: `Item has ${activeTransactions} active transactions. Please complete them first.`
      });
    }

    await prisma.inventoryItem.delete({
      where: { id }
    });

    logger.info(`Inventory item deleted: ${id}`);
    broadcastUpdate('inventory_deleted', { id });

    return res.json({ message: 'Inventory item deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting inventory item:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    return res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Update item quantity
router.patch('/:id/quantity', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason } = req.body;

    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ error: 'Invalid quantity value' });
    }

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { quantity },
      include: {
        category: true,
      }
    });

    // Log the quantity change
    logger.info(`Quantity updated for ${item.name}: ${existingItem.quantity} → ${quantity} (Reason: ${reason || 'Manual adjustment'})`);

    // Check for low stock changes
    if (existingItem.quantity > existingItem.minQuantity && item.quantity <= item.minQuantity) {
      await createLowStockAlert(item);
    } else if (existingItem.quantity <= existingItem.minQuantity && item.quantity > item.minQuantity) {
      await resolveLowStockAlert(item.id);
    }

    broadcastUpdate('inventory_updated', item);

    return res.json(item);
  } catch (error) {
    logger.error('Error updating item quantity:', error);
    return res.status(500).json({ error: 'Failed to update item quantity' });
  }
});

// Get inventory statistics
router.get('/stats/overview', async (req: AuthRequest, res) => {
  try {
    const [
      totalItems,
      totalValue,
      lowStockCount,
      expiringSoonCount,
      byCategory,
      byStatus,
      byType
    ] = await Promise.all([
      prisma.inventoryItem.count(),
      prisma.inventoryItem.aggregate({
        _sum: {
          unitPrice: true // FIX: Changed unitPrice to camelCase
        }
      }),
      prisma.inventoryItem.count({
        where: {
          quantity: { lte: prisma.inventoryItem.fields.minQuantity }
        }
      }),
      prisma.inventoryItem.count({
        where: {
          expiryDate: { // FIX: Changed expiryDate to camelCase
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          }
        }
      }),
      // FIX: Removed 'include' from groupBy as it's not supported directly
      prisma.inventoryItem.groupBy({
        by: ['categoryId'], // FIX: Changed categoryId to camelCase
        _count: { id: true },
        _sum: { quantity: true, unitPrice: true }, // FIX: Changed unitPrice to camelCase
      }),
      prisma.inventoryItem.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.inventoryItem.groupBy({
        by: ['itemType'], // FIX: Changed itemType to camelCase
        _count: { id: true },
        _sum: { quantity: true }
      })
    ]);

    const stats = {
      totalItems,
      totalValue: totalValue._sum.unitPrice || 0, // FIX: Changed unitPrice to camelCase
      lowStockCount,
      expiringSoonCount,
      // Frontend will need to map category names/colors based on categoryId
      byCategory: byCategory.map(item => ({
        categoryId: item.categoryId, // FIX: Changed categoryId to camelCase
        count: item._count.id,
        totalQuantity: item._sum.quantity || 0,
        totalValue: item._sum.unitPrice || 0 // FIX: Changed unitPrice to camelCase
      })),
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count.id
      })),
      byType: byType.map(item => ({
        type: item.itemType, // FIX: Changed itemType to camelCase
        count: item._count.id,
        totalQuantity: item._sum.quantity || 0
      }))
    };

    return res.json(stats);
  } catch (error) {
    logger.error('Error fetching inventory statistics:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Helper functions
async function createLowStockAlert(item: any) {
  try {
    const alertLevel = item.quantity === 0 ? 'out_of_stock' :
                     item.quantity <= item.minQuantity * 0.5 ? 'critical' : 'low'; // FIX: Changed minQuantity to camelCase

    // FIX: Changed upsert to findFirst + update/create as itemId is not unique
    const existingAlert = await prisma.lowStockAlert.findFirst({
      where: { itemId: item.id, status: 'active' } // Find an existing active alert for this item
    });

    if (existingAlert) {
      await prisma.lowStockAlert.update({
        where: { id: existingAlert.id }, // Update by unique ID
        data: {
          currentQuantity: item.quantity,
          minQuantity: item.minQuantity, // FIX: Changed minQuantity to camelCase
          alertLevel, // FIX: Changed alertLevel to camelCase
          status: 'active'
        }
      });
    } else {
      await prisma.lowStockAlert.create({
        data: {
          itemId: item.id,
          currentQuantity: item.quantity,
          minQuantity: item.minQuantity, // FIX: Changed minQuantity to camelCase
          alertLevel, // FIX: Changed alertLevel to camelCase
          status: 'active'
        }
      });
    }

    broadcastUpdate('low_stock_alert', {
      itemId: item.id,
      itemName: item.name,
      currentQuantity: item.quantity,
      minQuantity: item.minQuantity, // FIX: Changed minQuantity to camelCase
      alertLevel // FIX: Changed alertLevel to camelCase
    });
  } catch (error) {
    logger.error('Error creating low stock alert:', error);
  }
}

async function resolveLowStockAlert(itemId: string) {
  try {
    await prisma.lowStockAlert.updateMany({
      where: {
        itemId,
        status: 'active'
      },
      data: {
        status: 'resolved',
        resolvedAt: new Date()
      }
    });

    broadcastUpdate('low_stock_alert_resolved', { itemId });
  } catch (error) {
    logger.error('Error resolving low stock alert:', error);
  }
}

export default router;
