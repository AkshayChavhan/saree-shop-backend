import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError, ConflictError } from '../../middleware/error.middleware';

const router = Router();

/**
 * Generate slug from name
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * GET /api/admin/categories
 * List all categories
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      categories: categories.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        parent: category.parent,
        productCount: category._count.products,
        createdAt: category.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/categories/:id
 * Get single category
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/categories
 * Create new category
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, image, parentId, isActive = true, sortOrder = 0 } = req.body;

    if (!name) {
      throw new ValidationError('Category name is required');
    }

    // Generate unique slug
    let slug = generateSlug(name);
    const existingCategory = await prisma.category.findUnique({ where: { slug } });
    if (existingCategory) {
      throw new ConflictError('Category with this name already exists');
    }

    // Validate parent exists
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundError('Parent category not found');
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
        parentId,
        isActive,
        sortOrder,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Category created',
      category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/categories/:id
 * Update category
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, image, parentId, isActive, sortOrder } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Prevent setting self as parent
    if (parentId === id) {
      throw new ValidationError('Category cannot be its own parent');
    }

    // Validate parent exists
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundError('Parent category not found');
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Category updated',
      category: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Delete category
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (category._count.products > 0) {
      throw new ValidationError(
        `Cannot delete category with ${category._count.products} products. Move or delete products first.`
      );
    }

    if (category._count.children > 0) {
      throw new ValidationError(
        `Cannot delete category with ${category._count.children} subcategories. Delete subcategories first.`
      );
    }

    await prisma.category.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Category deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
