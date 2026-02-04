import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/products - List products with filters and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      sort = 'newest',
      minPrice = '0',
      maxPrice = '999999',
      inStock,
      page = '1',
      limit = '12'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const minPriceNum = parseInt(minPrice as string);
    const maxPriceNum = parseInt(maxPrice as string);

    // Build where clause
    const where: any = {
      isActive: true
    };

    if (category) {
      const categoryRecord = await prisma.category.findUnique({
        where: { slug: category as string },
        select: { id: true }
      });
      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      }
    }

    if (minPriceNum > 0 || maxPriceNum < 999999) {
      where.price = {
        gte: minPriceNum,
        lte: maxPriceNum
      };
    }

    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sort) {
      case 'price-low':
        orderBy = { price: 'asc' };
        break;
      case 'price-high':
        orderBy = { price: 'desc' };
        break;
      case 'popular':
        orderBy = { orderItems: { _count: 'desc' } };
        break;
      case 'rating':
        orderBy = { reviews: { _count: 'desc' } };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get total count
    const totalCount = await prisma.product.count({ where });

    // Get products
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        stock: true,
        createdAt: true,
        images: {
          select: { url: true },
          take: 1
        },
        category: {
          select: {
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            reviews: true,
            orderItems: true
          }
        }
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy
    });

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice || product.price * 1.3,
      rating: product._count.reviews > 0 ? 4.5 : 0,
      reviews: product._count.reviews,
      image: product.images[0]?.url || '/images/placeholder-product.jpg',
      colors: ['#000000'],
      category: product.category,
      stock: product.stock,
      isNew: new Date(product.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000),
      isBestseller: product._count.orderItems > 10,
      inStock: product.stock > 0
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      products: formattedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/products/featured - Get featured products
router.get('/featured', async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true
      },
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
        },
        category: {
          select: { name: true, slug: true }
        },
        _count: {
          select: { reviews: true }
        }
      },
      take: 8,
      orderBy: { createdAt: 'desc' }
    });

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice || product.price * 1.3,
      rating: product._count.reviews > 0 ? 4.5 : 0,
      reviews: product._count.reviews,
      image: product.images[0]?.url || '/images/placeholder-product.jpg',
      category: product.category,
      inStock: product.stock > 0
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error('Featured products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:slug - Get single product by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        colors: true,
        sizes: true,
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                name: true,
                imageUrl: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: { reviews: true }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;

    res.json({
      ...product,
      avgRating,
      reviewCount: product._count.reviews
    });
  } catch (error) {
    console.error('Product detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
