import express from 'express';
import { prisma, broadcastUpdate } from '../server';
import { logger } from '../utils/logger';
import { transactionSchema } from '../utils/validators';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all transactions
router.get('/', async (req: AuthRequest, res) => {
  try {
    const {
      itemId,
      userId,
      type,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    const where: any = {};

    // Build filters
    if (itemId) where.itemId = itemId;
    if (userId) where.userId = userId;
    if (type) where.transactionType = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              description: true,
              location: true,
              status: true,
              qrCode: true,
              category: {
                select: {
                  name: true,
                  color: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              department: true
            }
          },
          approver: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take,
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transaction by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            category: true
          }
        },
        user: true,
        approver: true
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check permissions (users can only view their own transactions unless admin/staff)
    if (currentUser.role !== 'admin' && currentUser.role !== 'staff' && transaction.userId !== currentUser.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(transaction);
  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create new transaction (checkout/checkin)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const validatedData = transactionSchema.parse(req.body);
    const currentUser = req.user!;

    // Verify item exists and is available for checkout
    const item = await prisma.inventoryItem.findUnique({
      where: { id: validatedData.itemId }
    });

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Validate transaction based on type
    if (validatedData.transactionType === 'checkout') {
      if (item.quantity < validatedData.quantity) {
        return res.status(400).json({ 
          error: 'Insufficient quantity',
          available: item.quantity,
          requested: validatedData.quantity
        });
      }

      if (item.status !== 'available') {
        return res.status(400).json({ 
          error: 'Item not available for checkout',
          currentStatus: item.status
        });
      }
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        ...validatedData,
        userId: currentUser.id,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        returnedDate: validatedData.transactionType === 'checkin' ? new Date() : null,
        status: validatedData.transactionType === 'checkin' ? 'completed' : 'active'
      },
      include: {
        item: {
          include: {
            category: true
          }
        },
        user: true
      }
    });

    // Update inventory quantity
    const quantityChange = validatedData.transactionType === 'checkout' ? 
      -validatedData.quantity : validatedData.quantity;

    await updateInventoryQuantity(validatedData.itemId, quantityChange);

    logger.info(`Transaction created: ${validatedData.transactionType} - ${item.name} (Qty: ${validatedData.quantity})`);
    broadcastUpdate('transaction_created', transaction);

    res.status(201).json(transaction);
  } catch (error: any) {
    logger.error('Error creating transaction:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction (return item, mark as completed, etc.)
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, returnedDate, conditionOnReturn, notes } = req.body;
    const currentUser = req.user!;

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: { item: true }
    });

    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.role !== 'staff' && 
        existingTransaction.userId !== currentUser.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updateData: any = {};
    
    if (status) updateData.status = status;
    if (returnedDate) updateData.returnedDate = new Date(returnedDate);
    if (conditionOnReturn !== undefined) updateData.conditionOnReturn = conditionOnReturn;
    if (notes !== undefined) updateData.notes = notes;

    // If marking as completed and it's a checkout, return the quantity
    if (status === 'completed' && existingTransaction.transactionType === 'checkout' && 
        existingTransaction.status === 'active') {
      await updateInventoryQuantity(existingTransaction.itemId, existingTransaction.quantity);
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        item: {
          include: {
            category: true
          }
        },
        user: true,
        approver: true
      }
    });

    logger.info(`Transaction updated: ${id} - Status: ${status}`);
    broadcastUpdate('transaction_updated', transaction);

    res.json(transaction);
  } catch (error) {
    logger.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Approve transaction (admin/staff only)
router.patch('/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    if (currentUser.role !== 'admin' && currentUser.role !== 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        approvedBy: currentUser.id,
        approvedAt: new Date()
      },
      include: {
        item: {
          include: {
            category: true
          }
        },
        user: true,
        approver: true
      }
    });

    logger.info(`Transaction approved: ${id} by ${currentUser.email}`);
    broadcastUpdate('transaction_approved', transaction);

    res.json(transaction);
  } catch (error: any) {
    logger.error('Error approving transaction:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(500).json({ error: 'Failed to approve transaction' });
  }
});

// Get user's transactions
router.get('/user/:userId', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;

    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.role !== 'staff' && currentUser.id !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            description: true,
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
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    res.json(transactions);
  } catch (error) {
    logger.error('Error fetching user transactions:', error);
    res.status(500).json({ error: 'Failed to fetch user transactions' });
  }
});

// Get overdue transactions
router.get('/overdue/list', async (req: AuthRequest, res) => {
  try {
    const overdueTransactions = await prisma.transaction.findMany({
      where: {
        status: 'active',
        dueDate: {
          lt: new Date()
        }
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            qrCode: true,
            category: {
              select: {
                name: true,
                color: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    // Update status to overdue
    await prisma.transaction.updateMany({
      where: {
        status: 'active',
        dueDate: {
          lt: new Date()
        }
      },
      data: {
        status: 'overdue'
      }
    });

    res.json(overdueTransactions);
  } catch (error) {
    logger.error('Error fetching overdue transactions:', error);
    res.status(500).json({ error: 'Failed to fetch overdue transactions' });
  }
});

// Get transaction statistics
router.get('/stats/overview', async (req: AuthRequest, res) => {
  try {
    const [
      totalTransactions,
      activeTransactions,
      overdueTransactions,
      completedTransactions,
      byType,
      byStatus,
      recentActivity
    ] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: 'active' } }),
      prisma.transaction.count({ where: { status: 'overdue' } }),
      prisma.transaction.count({ where: { status: 'completed' } }),
      prisma.transaction.groupBy({
        by: ['transactionType'],
        _count: { id: true }
      }),
      prisma.transaction.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              name: true,
              qrCode: true
            }
          },
          user: {
            select: {
              fullName: true
            }
          }
        }
      })
    ]);

    const stats = {
      totalTransactions,
      activeTransactions,
      overdueTransactions,
      completedTransactions,
      byType: byType.map(item => ({
        type: item.transactionType,
        count: item._count.id
      })),
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count.id
      })),
      recentActivity
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching transaction statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Helper function to update inventory quantity
async function updateInventoryQuantity(itemId: string, quantityChange: number) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId }
  });

  if (item) {
    const newQuantity = Math.max(0, item.quantity + quantityChange);
    
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity }
    });

    // Check for low stock alert
    if (item.quantity > item.minQuantity && newQuantity <= item.minQuantity) {
      const alertLevel = newQuantity === 0 ? 'out_of_stock' :
                        newQuantity <= item.minQuantity * 0.5 ? 'critical' : 'low';

      await prisma.lowStockAlert.upsert({
        where: { itemId },
        update: {
          currentQuantity: newQuantity,
          minQuantity: item.minQuantity,
          alertLevel,
          status: 'active'
        },
        create: {
          itemId,
          currentQuantity: newQuantity,
          minQuantity: item.minQuantity,
          alertLevel,
          status: 'active'
        }
      });

      broadcastUpdate('low_stock_alert', {
        itemId,
        itemName: item.name,
        currentQuantity: newQuantity,
        minQuantity: item.minQuantity,
        alertLevel
      });
    } else if (item.quantity <= item.minQuantity && newQuantity > item.minQuantity) {
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
    }
  }
}

export default router;