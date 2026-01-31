import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { ValidationError, NotFoundError } from '../middleware/error.middleware';

const router = Router();

/**
 * GET /api/cart
 * Get user's cart with items
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1 },
              },
            },
            color: true,
            size: true,
          },
        },
      },
    });

    // Create cart if doesn't exist
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { take: 1 },
                },
              },
              color: true,
              size: true,
            },
          },
        },
      });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

    res.json({
      success: true,
      cart: {
        id: cart.id,
        items: cart.items.map(item => ({
          id: item.id,
          productId: item.productId,
          product: {
            name: item.product.name,
            slug: item.product.slug,
            price: item.product.price,
            image: item.product.images[0]?.url || null,
            stock: item.product.stock,
          },
          quantity: item.quantity,
          color: item.color ? { name: item.color.name, hexCode: item.color.hexCode } : null,
          size: item.size ? { name: item.size.name } : null,
          itemTotal: item.product.price * item.quantity,
        })),
      },
      subtotal,
      itemCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cart
 * Add item to cart
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { productId, quantity = 1, colorId, sizeId } = req.body;

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    // Validate product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.stock < quantity) {
      throw new ValidationError(`Only ${product.stock} items available in stock`);
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        colorId: colorId || null,
        sizeId: sizeId || null,
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        throw new ValidationError(`Cannot add more items. Only ${product.stock} available`);
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          colorId: colorId || null,
          sizeId: sizeId || null,
        },
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1 } } },
            color: true,
            size: true,
          },
        },
      },
    });

    const subtotal = updatedCart!.items.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);

    const itemCount = updatedCart!.items.reduce((count, item) => count + item.quantity, 0);

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      cart: {
        id: updatedCart!.id,
        items: updatedCart!.items.map(item => ({
          id: item.id,
          productId: item.productId,
          product: {
            name: item.product.name,
            slug: item.product.slug,
            price: item.product.price,
            image: item.product.images[0]?.url || null,
          },
          quantity: item.quantity,
          color: item.color ? { name: item.color.name, hexCode: item.color.hexCode } : null,
          size: item.size ? { name: item.size.name } : null,
          itemTotal: item.product.price * item.quantity,
        })),
      },
      subtotal,
      itemCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/cart/items/:itemId
 * Update cart item quantity
 */
router.patch('/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      throw new ValidationError('Quantity must be at least 1');
    }

    // Find cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId },
      },
      include: { product: true },
    });

    if (!cartItem) {
      throw new NotFoundError('Cart item not found');
    }

    if (quantity > cartItem.product.stock) {
      throw new ValidationError(`Only ${cartItem.product.stock} items available`);
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    res.json({
      success: true,
      message: 'Cart item updated',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/cart/items/:itemId
 * Remove item from cart
 */
router.delete('/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { itemId } = req.params;

    // Find cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId },
      },
    });

    if (!cartItem) {
      throw new NotFoundError('Cart item not found');
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    res.json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/cart
 * Clear entire cart
 */
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const cart = await prisma.cart.findUnique({ where: { userId } });

    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    res.json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
