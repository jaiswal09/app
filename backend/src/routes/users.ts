import express from 'express';
import { prisma, broadcastUpdate } from '../server';
import { logger } from '../utils/logger';
import { userProfileUpdateSchema } from '../utils/validators';
import { requireAdmin, requireAdminOrStaff, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all users (admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.userProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (admin/staff can view all, others can only view their own)
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.role !== 'staff' && currentUser.id !== id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await prisma.userProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const validatedData = userProfileUpdateSchema.parse(req.body);

    // Only admin can change role and active status
    if (currentUser.role !== 'admin') {
      delete validatedData.role;
      delete validatedData.isActive;
    }

    const updatedUser = await prisma.userProfile.update({
      where: { id },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });

    logger.info(`User profile updated: ${updatedUser.email}`);
    broadcastUpdate('user_updated', updatedUser);

    res.json(updatedUser);
  } catch (error: any) {
    logger.error('Error updating user:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    // Prevent admin from deleting themselves
    if (currentUser.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await prisma.userProfile.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user and profile (cascade will handle related records)
    await prisma.user.delete({
      where: { id: user.userId }
    });

    logger.info(`User deleted: ${user.email}`);
    broadcastUpdate('user_deleted', { id });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user statistics (admin/staff only)
router.get('/stats/overview', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const totalUsers = await prisma.userProfile.count();
    const activeUsers = await prisma.userProfile.count({
      where: { isActive: true }
    });
    const usersByRole = await prisma.userProfile.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.id
      }))
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching user statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;