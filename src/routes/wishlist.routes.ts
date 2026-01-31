import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { ValidationError, NotFoundError } from '../middleware/error.middleware';

const router = Router();

/**
 * GET /api/wishlist
 * Get user's wishlist
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    let wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1 },
                colors: true,
              },
            },
          },
        },
      },
    });

    // Create wishlist if doesn't exist
    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { take: 1 },
                  colors: true,
                },
              },
            },
          },
        },
      });
    }

    res.json({
      success: true,
      wishlist: {
        id: wishlist.id,
        items: wishlist.items.map(item => ({
          id: item.id,
          product: {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            price: item.product.price,
            comparePrice: item.product.comparePrice,
            rating: item.product.rating,
            image: item.product.images[0]?.url || null,
            colors: item.product.colors.map(c => c.name),
            inStock: item.product.stock > 0,
          },
          addedAt: item.createdAt,
        })),
      },
      itemCount: wishlist.items.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/wishlist
 * Add item to wishlist
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { productId } = req.body;

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Get or create wishlist
    let wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      wishlist = await prisma.wishlist.create({ data: { userId } });
    }

    // Check if item already exists
    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    if (existingItem) {
      res.json({
        success: true,
        message: 'Item already in wishlist',
      });
      return;
    }

    // Add item to wishlist
    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Item added to wishlist',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/wishlist/:id
 * Remove item from wishlist
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Find wishlist item
    const wishlistItem = await prisma.wishlistItem.findFirst({
      where: {
        id,
        wishlist: { userId },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundError('Wishlist item not found');
    }

    await prisma.wishlistItem.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Item removed from wishlist',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/wishlist/check
 * Check if products are in wishlist
 */
router.post('/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { productIds } = req.body;

    if (!Array.isArray(productIds)) {
      throw new ValidationError('productIds must be an array');
    }

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          where: {
            productId: { in: productIds },
          },
          select: { productId: true },
        },
      },
    });

    const inWishlist = wishlist?.items.map(item => item.productId) || [];

    res.json({
      success: true,
      inWishlist,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
