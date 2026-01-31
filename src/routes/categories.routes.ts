import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../middleware/error.middleware';

const router = Router();

/**
 * GET /api/categories
 * List all active categories
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
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
        productCount: category._count.products,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/:slug
 * Get single category with products
 */
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { page = '1', limit = '12' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12));

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            images: { take: 1 },
            colors: true,
          },
        },
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const totalPages = Math.ceil(category._count.products / limitNum);

    res.json({
      success: true,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
      },
      products: category.products.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        comparePrice: product.comparePrice,
        rating: product.rating,
        reviewCount: product.reviewCount,
        image: product.images[0]?.url || null,
        colors: product.colors.map(c => c.name),
        isNew: product.isNew,
        isBestseller: product.isBestseller,
        inStock: product.stock > 0,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount: category._count.products,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
