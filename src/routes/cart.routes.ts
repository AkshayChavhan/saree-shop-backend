import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All cart routes require authentication
router.use(requireAuth);

// GET /api/cart - Get user's cart
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get or create cart for user
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                colors: true,
                sizes: true,
              }
            }
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: true,
                  colors: true,
                  sizes: true,
                }
              }
            }
          }
        }
      });
    }

    // Calculate cart totals
    const subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

    res.json({
      ...cart,
      subtotal,
      itemCount
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cart - Add item to cart
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Check if product exists and get current price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true, stock: true, isActive: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.isActive) {
      return res.status(400).json({ error: 'Product is not available' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        error: `Only ${product.stock} items available in stock`
      });
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: true }
      });
    }

    // Check if item already exists in cart
    const existingItem = cart.items.find(item => item.productId === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (product.stock < newQuantity) {
        return res.status(400).json({
          error: `Only ${product.stock} items available in stock`
        });
      }

      // Update existing item
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          price: product.price
        }
      });
    } else {
      // Add new item to cart
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          price: product.price
        }
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                colors: true,
                sizes: true,
              }
            }
          }
        }
      }
    });

    const subtotal = updatedCart!.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = updatedCart!.items.reduce((count, item) => count + item.quantity, 0);

    res.json({
      ...updatedCart,
      subtotal,
      itemCount
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/cart/items/:itemId - Update cart item quantity
router.patch('/items/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Find the cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId }
      },
      include: { product: true }
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (cartItem.product.stock < quantity) {
      return res.status(400).json({
        error: `Only ${cartItem.product.stock} items available in stock`
      });
    }

    // Update quantity
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    });

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                colors: true,
                sizes: true,
              }
            }
          }
        }
      }
    });

    const subtotal = updatedCart!.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = updatedCart!.items.reduce((count, item) => count + item.quantity, 0);

    res.json({
      ...updatedCart,
      subtotal,
      itemCount
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { itemId } = req.params;

    // Find the cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId }
      }
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Delete the item
    await prisma.cartItem.delete({
      where: { id: itemId }
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cart - Clear entire cart
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Clear all items from cart
    await prisma.cartItem.deleteMany({
      where: {
        cart: { userId }
      }
    });

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
