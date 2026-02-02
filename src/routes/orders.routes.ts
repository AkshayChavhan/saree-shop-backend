import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All order routes require authentication
router.use(requireAuth);

// GET /api/orders - List user's orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                images: { take: 1 }
              }
            }
          }
        },
        shippingAddress: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1 }
              }
            }
          }
        },
        shippingAddress: true,
        billingAddress: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders - Create order (usually done via payment flow)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { shippingAddressId, billingAddressId, paymentMethod } = req.body;

    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    const tax = 0; // No tax for now, can be calculated based on GST
    const shipping = subtotal > 999 ? 0 : 99; // Free shipping over ₹999
    const total = subtotal + tax + shipping;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        subtotal,
        tax,
        shipping,
        total,
        shippingAddressId,
        billingAddressId: billingAddressId || shippingAddressId,
        paymentMethod: paymentMethod || 'PENDING',
        items: {
          create: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            total: item.product.price * item.quantity
          }))
        }
      },
      include: {
        items: {
          include: { product: true }
        },
        shippingAddress: true
      }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
