import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../middleware/error.middleware';

const router = Router();

/**
 * GET /api/products
 * List products with filtering, sorting, and pagination
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      sort = 'newest',
      inStock,
      search,
      page = '1',
      limit = '12'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { isActive: true };

    if (category) {
      where.category = { slug: category as string };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'price-low':
        orderBy = { price: 'asc' };
        break;
      case 'price-high':
        orderBy = { price: 'desc' };
        break;
      case 'popular':
        orderBy = { salesCount: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Execute queries in parallel
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          images: { take: 1 },
          colors: true,
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        comparePrice: product.comparePrice,
        rating: product.rating,
        reviewCount: product.reviewCount,
        image: product.images[0]?.url || null,
        colors: product.colors.map(c => c.name),
        category: product.category?.name,
        stock: product.stock,
        isNew: product.isNew,
        isBestseller: product.isBestseller,
        inStock: product.stock > 0,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/featured
 * Get featured products for homepage
 */
router.get('/featured', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { take: 1 },
        colors: true,
      },
    });

    res.json({
      success: true,
      products: products.map(product => ({
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
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:slug
 * Get single product by slug
 */
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        colors: true,
        sizes: true,
        variants: true,
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      product: {
        ...product,
        inStock: product.stock > 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
