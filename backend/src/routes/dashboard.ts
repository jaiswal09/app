import express from 'express';
import { prisma } from '../server';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get dashboard overview statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [
      totalItems,
      lowStockItems,
      activeTransactions,
      overdueItems,
      maintenanceDue,
      totalValue,
      recentTransactions,
      categoryDistribution,
      usageStats,
      alertStats
    ] = await Promise.all([
      // Total inventory items
      prisma.inventoryItem.count(),
      
      // Low stock items count
      prisma.lowStockAlert.count({
        where: { status: 'active' }
      }),
      
      // Active transactions
      prisma.transaction.count({
        where: { status: 'active' }
      }),
      
      // Overdue transactions
      prisma.transaction.count({
        where: { status: 'overdue' }
      }),
      
      // Maintenance due (next 30 days)
      prisma.maintenanceSchedule.count({
        where: {
          status: { in: ['scheduled', 'in_progress'] },
          scheduledDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Total inventory value
      prisma.inventoryItem.aggregate({
        _sum: {
          unitPrice: true
        }
      }),
      
      // Recent transactions (last 10)
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
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
              fullName: true,
              role: true
            }
          }
        }
      }),
      
      // Category distribution
      prisma.inventoryItem.groupBy({
        by: ['categoryId'],
        _count: { id: true },
        _sum: { 
          quantity: true,
          unitPrice: true 
        }
      }),
      
      // Usage statistics (last 30 days)
      prisma.transaction.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: { id: true }
      }),
      
      // Alert statistics
      prisma.lowStockAlert.groupBy({
        by: ['alertLevel'],
        where: { status: 'active' },
        _count: { id: true }
      })
    ]);

    // Get category names for distribution
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, color: true }
    });

    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = { name: cat.name, color: cat.color };
      return acc;
    }, {} as Record<string, { name: string; color: string }>);

    // Format category distribution
    const formattedCategoryDistribution = categoryDistribution.map(item => ({
      category: item.categoryId ? categoryMap[item.categoryId]?.name || 'Unknown' : 'Uncategorized',
      color: item.categoryId ? categoryMap[item.categoryId]?.color || '#6B7280' : '#6B7280',
      count: item._count.id,
      totalQuantity: item._sum.quantity || 0,
      value: item._sum.unitPrice || 0
    }));

    // Format usage stats (group by day)
    const usageByDay = usageStats.reduce((acc, stat) => {
      const date = new Date(stat.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    const formattedUsageStats = Object.entries(usageByDay).map(([date, count]) => ({
      date,
      transactions: count
    })).sort((a, b) => a.date.localeCompare(b.date));

    const dashboardStats = {
      totalItems,
      lowStockItems,
      activeTransactions,
      overdueItems,
      maintenanceDue,
      totalValue: totalValue._sum.unitPrice || 0,
      recentActivity: recentTransactions,
      categoryDistribution: formattedCategoryDistribution,
      usageStats: formattedUsageStats,
      alertStats: {
        total: lowStockItems,
        byLevel: alertStats.map(stat => ({
          level: stat.alertLevel,
          count: stat._count.id
        }))
      }
    };

    res.json(dashboardStats);
  } catch (error) {
    logger.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get recent activity (transactions, alerts, maintenance)
router.get('/activity', async (req: AuthRequest, res) => {
  try {
    const { limit = '20' } = req.query;
    const take = parseInt(limit as string);

    const [recentTransactions, recentAlerts, recentMaintenance] = await Promise.all([
      prisma.transaction.findMany({
        take: Math.floor(take / 3),
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
      }),
      
      prisma.lowStockAlert.findMany({
        take: Math.floor(take / 3),
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              name: true,
              qrCode: true
            }
          }
        }
      }),
      
      prisma.maintenanceSchedule.findMany({
        take: Math.floor(take / 3),
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              name: true,
              serialNumber: true
            }
          },
          technician: {
            select: {
              fullName: true
            }
          }
        }
      })
    ]);

    // Combine and sort all activities
    const activities = [
      ...recentTransactions.map(t => ({
        id: t.id,
        type: 'transaction',
        action: t.transactionType,
        description: `${t.transactionType} - ${t.item.name}`,
        user: t.user.fullName,
        timestamp: t.createdAt,
        details: {
          itemName: t.item.name,
          qrCode: t.item.qrCode,
          quantity: t.quantity,
          status: t.status
        }
      })),
      ...recentAlerts.map(a => ({
        id: a.id,
        type: 'alert',
        action: 'low_stock',
        description: `Low stock alert - ${a.item.name}`,
        user: 'System',
        timestamp: a.createdAt,
        details: {
          itemName: a.item.name,
          currentQuantity: a.currentQuantity,
          minQuantity: a.minQuantity,
          alertLevel: a.alertLevel
        }
      })),
      ...recentMaintenance.map(m => ({
        id: m.id,
        type: 'maintenance',
        action: m.maintenanceType,
        description: `${m.maintenanceType} maintenance - ${m.item.name}`,
        user: m.technician?.fullName || 'Unassigned',
        timestamp: m.createdAt,
        details: {
          itemName: m.item.name,
          serialNumber: m.item.serialNumber,
          scheduledDate: m.scheduledDate,
          status: m.status
        }
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(activities.slice(0, take));
  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Get quick actions data
router.get('/quick-actions', async (req: AuthRequest, res) => {
  try {
    const currentUser = req.user!;

    const [
      pendingApprovals,
      overdueReturns,
      criticalAlerts,
      upcomingMaintenance,
      userActiveTransactions
    ] = await Promise.all([
      // Pending transaction approvals (admin/staff only)
      currentUser.role === 'admin' || currentUser.role === 'staff' 
        ? prisma.transaction.count({
            where: {
              status: 'active',
              approvedBy: null
            }
          })
        : 0,
      
      // Overdue returns
      prisma.transaction.count({
        where: {
          status: 'overdue'
        }
      }),
      
      // Critical stock alerts
      prisma.lowStockAlert.count({
        where: {
          status: 'active',
          alertLevel: { in: ['critical', 'out_of_stock'] }
        }
      }),
      
      // Upcoming maintenance (next 7 days)
      prisma.maintenanceSchedule.count({
        where: {
          status: { in: ['scheduled', 'in_progress'] },
          scheduledDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // User's active transactions
      prisma.transaction.count({
        where: {
          userId: currentUser.id,
          status: 'active'
        }
      })
    ]);

    const quickActions = {
      pendingApprovals,
      overdueReturns,
      criticalAlerts,
      upcomingMaintenance,
      userActiveTransactions,
      canApprove: currentUser.role === 'admin' || currentUser.role === 'staff',
      canManageInventory: currentUser.role === 'admin' || currentUser.role === 'staff'
    };

    res.json(quickActions);
  } catch (error) {
    logger.error('Error fetching quick actions:', error);
    res.status(500).json({ error: 'Failed to fetch quick actions' });
  }
});

// Get performance metrics
router.get('/metrics', async (req: AuthRequest, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      transactionTrends,
      inventoryTurnover,
      maintenanceCosts,
      alertTrends
    ] = await Promise.all([
      // Transaction trends
      prisma.transaction.groupBy({
        by: ['createdAt', 'transactionType'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: { id: true }
      }),
      
      // Inventory turnover (items checked out vs available)
      prisma.inventoryItem.aggregate({
        _avg: { quantity: true },
        _sum: { quantity: true }
      }),
      
      // Maintenance costs
      prisma.maintenanceSchedule.aggregate({
        _sum: { cost: true },
        _count: { id: true },
        where: {
          completedDate: { gte: startDate },
          status: 'completed'
        }
      }),
      
      // Alert resolution trends
      prisma.lowStockAlert.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: { id: true }
      })
    ]);

    const metrics = {
      transactionTrends: transactionTrends.map(t => ({
        date: new Date(t.createdAt).toISOString().split('T')[0],
        type: t.transactionType,
        count: t._count.id
      })),
      inventoryTurnover: {
        averageQuantity: inventoryTurnover._avg.quantity || 0,
        totalQuantity: inventoryTurnover._sum.quantity || 0
      },
      maintenanceCosts: {
        totalCost: maintenanceCosts._sum.cost || 0,
        completedCount: maintenanceCosts._count.id
      },
      alertTrends: alertTrends.map(a => ({
        date: new Date(a.createdAt).toISOString().split('T')[0],
        count: a._count.id
      }))
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

export default router;