import express from 'express';
import { prisma, broadcastUpdate } from '../server';
import { logger } from '../utils/logger';
import { categorySchema } from '../utils/validators';
import { requireAdminOrStaff, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all categories
router.get('/', async (req: AuthRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get category by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true
          }
        },
        items: {
          select: {
            id: true,
            name: true,
            status: true,
            quantity: true,
            minQuantity: true,
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    logger.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create new category (admin/staff only)
router.post('/', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const validatedData = categorySchema.parse(req.body);
    const currentUser = req.user!;

    const category = await prisma.category.create({
      data: {
        ...validatedData,
        createdBy: currentUser.id
      },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    logger.info(`Category created: ${category.name}`);
    broadcastUpdate('category_created', category);

    res.status(201).json(category);
  } catch (error: any) {
    logger.error('Error creating category:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Category name already exists' });
    }

    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (admin/staff only)
router.put('/:id', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = categorySchema.parse(req.body);

    const category = await prisma.category.update({
      where: { id },
      data: validatedData,
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    logger.info(`Category updated: ${category.name}`);
    broadcastUpdate('category_updated', category);

    res.json(category);
  } catch (error: any) {
    logger.error('Error updating category:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Category name already exists' });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (admin/staff only)
router.delete('/:id', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if category has items
    const itemCount = await prisma.inventoryItem.count({
      where: { categoryId: id }
    });

    if (itemCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with items',
        details: `Category has ${itemCount} items. Please reassign or delete them first.`
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    logger.info(`Category deleted: ${id}`);
    broadcastUpdate('category_deleted', { id });

    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting category:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Toggle category status (admin/staff only)
router.patch('/:id/toggle-status', requireAdminOrStaff, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        isActive: !category.isActive
      },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    logger.info(`Category status toggled: ${updatedCategory.name} - ${updatedCategory.isActive ? 'Active' : 'Inactive'}`);
    broadcastUpdate('category_updated', updatedCategory);

    res.json(updatedCategory);
  } catch (error) {
    logger.error('Error toggling category status:', error);
    res.status(500).json({ error: 'Failed to toggle category status' });
  }
});

export default router;