import express from 'express';
import { prisma, broadcastUpdate } from '../server'; // No 'db' import needed
import { logger } from '../utils/logger';
import { billSchema, billPaymentSchema } from '../utils/validators';
import { requireAdminOrStaff, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all bills
router.get('/', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const {
      status,
      paymentStatus,
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(startDate as string);
      if (endDate) where.billDate.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          items: true,
          payments: true,
          _count: {
            select: {
              items: true,
              payments: true
            }
          }
        },
        orderBy: {
          billDate: 'desc'
        },
        skip,
        take,
      }),
      prisma.bill.count({ where })
    ]);

    res.json({
      bills,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Get bill by ID
router.get('/:id', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        creator: true,
        items: true,
        payments: {
          include: {
            creator: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          },
          orderBy: {
            paymentDate: 'desc'
          }
        }
      }
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json(bill);
  } catch (error) {
    logger.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// Create new bill (admin/staff only)
router.post('/', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const validatedData = billSchema.parse(req.body);
    const currentUser = req.user!;

    // Generate bill number
    const billCount = await prisma.bill.count();
    const billNumber = `BILL-${String(billCount + 1).padStart(6, '0')}`;

    const bill = await prisma.$transaction(async (tx) => {
      // Step 1: Validate and deduct inventory quantities within the same Prisma transaction
      for (const item of validatedData.items) {
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.itemId },
          select: { quantity: true, name: true } // Select name for error message
        });

        if (!inventoryItem) {
          throw new Error(`Inventory item not found: ${item.itemId}`);
        }

        const currentQuantity = inventoryItem.quantity;
        const requestedQuantity = item.quantity;

        if (currentQuantity < requestedQuantity) {
          throw new Error(`Insufficient stock for item ${inventoryItem.name}. Available: ${currentQuantity}, Requested: ${requestedQuantity}`);
        }

        // Deduct quantity
        await tx.inventoryItem.update({
          where: { id: item.itemId },
          data: { quantity: currentQuantity - requestedQuantity }
        });
      }

      // Step 2: Create the bill in Prisma
      const newBill = await tx.bill.create({
        data: {
          billNumber,
          customerName: validatedData.customerName,
          customerEmail: validatedData.customerEmail,
          customerPhone: validatedData.customerPhone,
          customerAddress: validatedData.customerAddress,
          billDate: new Date(validatedData.billDate),
          dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
          subtotal: validatedData.subtotal,
          taxRate: validatedData.taxRate,
          taxAmount: validatedData.taxAmount,
          discountAmount: validatedData.discountAmount,
          totalAmount: validatedData.totalAmount,
          notes: validatedData.notes,
          createdBy: currentUser.id,
          paymentStatus: 'pending' // Default for new bills
        }
      });

      // Step 3: Create bill items in Prisma
      const billItems = await Promise.all(
        validatedData.items.map(item =>
          tx.billItem.create({
            data: {
              billId: newBill.id,
              itemId: item.itemId, // Store itemId for inventory restoration
              itemName: item.itemName,
              itemDescription: item.itemDescription,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            }
          })
        )
      );

      return { ...newBill, items: billItems };
    });

    logger.info(`Bill created: ${billNumber}`);
    broadcastUpdate('bill_created', bill);

    res.status(201).json(bill);
  } catch (error: any) {
    logger.error('Error creating bill:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    // Catch specific errors from inventory transaction
    if (error.message.includes('Insufficient stock') || error.message.includes('Inventory item not found')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to create bill' });
  }
});

// Update bill (admin/staff only)
router.put('/:id', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = billSchema.parse(req.body);

    const bill = await prisma.$transaction(async (tx) => {
      // Step 1: Get old bill items to restore inventory
      const oldBillItems = await tx.billItem.findMany({
        where: { billId: id }
      });

      // Step 2: Restore old quantities in inventory
      for (const oldItem of oldBillItems) {
        // Only restore if itemId exists (i.e., it was an inventory item)
        if (oldItem.itemId) {
          await tx.inventoryItem.update({
            where: { id: oldItem.itemId },
            data: { quantity: { increment: oldItem.quantity } } // Use increment for atomic update
          });
        }
      }

      // Step 3: Delete existing bill items
      await tx.billItem.deleteMany({
        where: { billId: id }
      });

      // Step 4: Validate and deduct new inventory quantities
      for (const newItem of validatedData.items) {
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: newItem.itemId },
          select: { quantity: true, name: true } // Select name for error message
        });

        if (!inventoryItem) {
          throw new Error(`Inventory item not found: ${newItem.itemId}`);
        }

        const currentQuantity = inventoryItem.quantity;
        const requestedQuantity = newItem.quantity;

        if (currentQuantity < requestedQuantity) {
          throw new Error(`Insufficient stock for item ${inventoryItem.name}. Available: ${currentQuantity}, Requested: ${requestedQuantity}`);
        }

        // Deduct quantity
        await tx.inventoryItem.update({
          where: { id: newItem.itemId },
          data: { quantity: { decrement: requestedQuantity } } // Use decrement for atomic update
        });
      }

      // Step 5: Update bill
      const updatedBill = await tx.bill.update({
        where: { id },
        data: {
          customerName: validatedData.customerName,
          customerEmail: validatedData.customerEmail,
          customerPhone: validatedData.customerPhone,
          customerAddress: validatedData.customerAddress,
          billDate: new Date(validatedData.billDate),
          dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
          subtotal: validatedData.subtotal,
          taxRate: validatedData.taxRate,
          taxAmount: validatedData.taxAmount,
          discountAmount: validatedData.discountAmount,
          totalAmount: validatedData.totalAmount,
          notes: validatedData.notes,
          status: validatedData.status // Ensure status is updated
        }
      });

      // Step 6: Create new bill items
      const billItems = await Promise.all(
        validatedData.items.map(item =>
          tx.billItem.create({
            data: {
              billId: id,
              itemId: item.itemId, // Store itemId for inventory restoration
              itemName: item.itemName,
              itemDescription: item.itemDescription,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            }
          })
        )
      );

      return { ...updatedBill, items: billItems };
    });

    logger.info(`Bill updated: ${id}`);
    broadcastUpdate('bill_updated', bill);

    res.json(bill);
  } catch (error: any) {
    logger.error('Error updating bill:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Catch specific errors from inventory transaction
    if (error.message.includes('Insufficient stock') || error.message.includes('Inventory item not found')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// Update bill status (no inventory change here, as it's just status)
router.patch('/:id/status', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const bill = await prisma.bill.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        payments: true
      }
    });

    logger.info(`Bill status updated: ${id} - ${status || 'N/A'}/${paymentStatus || 'N/A'}`);
    broadcastUpdate('bill_updated', bill);

    res.json(bill);
  } catch (error: any) {
    logger.error('Error updating bill status:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.status(500).json({ error: 'Failed to update bill status' });
  }
});

// Add payment to bill
router.post('/:id/payments', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id: billId } = req.params;
    const validatedData = billPaymentSchema.parse({ ...req.body, billId });
    const currentUser = req.user!;

    const payment = await prisma.billPayment.create({
      data: {
        ...validatedData,
        paymentDate: new Date(validatedData.paymentDate),
        createdBy: currentUser.id
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // Update bill payment status based on total payments
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { payments: true }
    });

    if (bill) {
      const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
      let paymentStatus = 'pending';
      
      if (totalPaid >= bill.totalAmount) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      await prisma.bill.update({
        where: { id: billId },
        data: { paymentStatus }
      });
    }

    logger.info(`Payment added to bill ${billId}: ${validatedData.amount}`);
    broadcastUpdate('payment_added', { billId, payment });

    res.status(201).json(payment);
  } catch (error: any) {
    logger.error('Error adding payment:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({ error: 'Failed to add payment' });
  }
});

// Delete bill (admin/staff only)
router.delete('/:id', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      // Step 1: Get bill items to restore inventory
      const billItemsToRestore = await tx.billItem.findMany({
        where: { billId: id }
      });

      // Step 2: Restore inventory quantities
      for (const item of billItemsToRestore) {
        // Only restore if itemId exists (i.e., it was an inventory item)
        if (item.itemId) {
          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: { quantity: { increment: item.quantity } } // Use increment for atomic update
          });
        }
      }

      // Step 3: Delete the bill (Prisma will handle cascade delete for bill_items and bill_payments if configured)
      await tx.bill.delete({
        where: { id }
      });
    });


    logger.info(`Bill deleted: ${id}`);
    broadcastUpdate('bill_deleted', { id });

    res.json({ message: 'Bill deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting bill:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// Get bill statistics
router.get('/stats/overview', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const [
      totalBills,
      totalRevenue,
      pendingPayments,
      overduePayments,
      byStatus,
      byPaymentStatus,
      monthlyRevenue
    ] = await Promise.all([
      prisma.bill.count(),
      prisma.bill.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'paid' }
      }),
      prisma.bill.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'pending' }
      }),
      prisma.bill.count({
        where: {
          status: 'overdue',
          paymentStatus: { not: 'paid' }
        }
      }),
      prisma.bill.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.bill.groupBy({
        by: ['paymentStatus'],
        _count: { id: true },
        _sum: { totalAmount: true }
      }),
      prisma.bill.groupBy({
        by: ['billDate'],
        _sum: { totalAmount: true },
        where: {
          billDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)
          },
          paymentStatus: 'paid'
        }
      })
    ]);

    const stats = {
      totalBills,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      pendingPayments: pendingPayments._sum.totalAmount || 0,
      overduePayments,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count.id
      })),
      byPaymentStatus: byPaymentStatus.map(item => ({
        status: item.paymentStatus,
        count: item._count.id,
        amount: item._sum.totalAmount || 0
      })),
      monthlyRevenue: monthlyRevenue.map(item => ({
        month: item.billDate,
        revenue: item._sum.totalAmount || 0
      }))
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching bill statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
