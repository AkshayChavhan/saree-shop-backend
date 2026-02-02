import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/categories - List all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image || '/images/placeholder-category.jpg',
      count: category._count.products
    }));

    res.json(formattedCategories);
  } catch (error) {
    console.error('Categories API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/categories/:slug - Get category with products
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { page = '1', limit = '12' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            stock: true,
            images: {
              select: { url: true },
              take: 1
            }
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const totalPages = Math.ceil(category._count.products / limitNum);

    res.json({
      ...category,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount: category._count.products,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Category detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
