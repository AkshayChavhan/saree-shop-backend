import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All wishlist routes require authentication
router.use(requireAuth);

// GET /api/wishlist - Get user's wishlist
router.get('/', async (req: Request, res: Response) => {
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
                category: true
              }
            }
          }
        }
      }
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { take: 1 },
                  category: true
                }
              }
            }
          }
        }
      });
    }

    res.json(wishlist);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wishlist - Add item to wishlist
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get or create wishlist
    let wishlist = await prisma.wishlist.findUnique({
      where: { userId }
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { userId }
      });
    }

    // Check if item already in wishlist
    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId
      }
    });

    if (existingItem) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    // Add item to wishlist
    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId
      }
    });

    // Return updated wishlist
    const updatedWishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1 },
                category: true
              }
            }
          }
        }
      }
    });

    res.json(updatedWishlist);
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/wishlist/:productId - Remove item from wishlist
router.delete('/:productId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { productId } = req.params;

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId }
    });

    if (!wishlist) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    // Delete the item
    await prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productId
      }
    });

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
