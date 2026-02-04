import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import stripe from '../lib/stripe';
import razorpay from '../lib/razorpay';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All payment routes require authentication
router.use(requireAuth);

// POST /api/payments/create-intent - Create payment intent
router.post('/create-intent', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { paymentGateway, shippingAddressId, billingAddressId } = req.body;

    if (!shippingAddressId) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

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

    // Validate stock availability
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${item.product.name}`
        });
      }
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    const tax = 0; // No tax for now
    const shipping = subtotal > 999 ? 0 : 99;
    const total = subtotal + tax + shipping;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create pending order
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
        paymentMethod: paymentGateway?.toUpperCase() || 'PENDING',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: {
          create: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            total: item.product.price * item.quantity
          }))
        }
      }
    });

    // Create payment based on gateway
    if (paymentGateway === 'stripe' && stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100), // Convert to paise
        currency: 'inr',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber
        }
      });

      return res.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total
        },
        clientSecret: paymentIntent.client_secret,
        gateway: 'stripe'
      });
    }

    if (paymentGateway === 'razorpay' && razorpay) {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(total * 100), // Convert to paise
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id
        }
      });

      return res.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total
        },
        razorpayOrderId: razorpayOrder.id,
        gateway: 'razorpay'
      });
    }

    // COD or other payment method
    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total
      },
      gateway: 'cod'
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/payments/confirm - Confirm payment
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { orderId, paymentId, gateway } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentId
      }
    });

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: {
        cart: { userId }
      }
    });

    res.json({ success: true, message: 'Payment confirmed' });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
