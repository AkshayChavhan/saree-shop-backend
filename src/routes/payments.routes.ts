import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { stripe, isStripeEnabled, formatAmountForStripe } from '../lib/stripe';
import { razorpay, isRazorpayEnabled, formatAmountForRazorpay } from '../lib/razorpay';
import { ValidationError, NotFoundError } from '../middleware/error.middleware';

const router = Router();

/**
 * Generate unique order number
 */
const generateOrderNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}-${random}`;
};

/**
 * POST /api/payments/create-intent
 * Create payment intent and order
 */
router.post('/create-intent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { paymentGateway, shippingAddressId, billingAddressId } = req.body;

    if (!paymentGateway || !['stripe', 'razorpay'].includes(paymentGateway)) {
      throw new ValidationError('Invalid payment gateway. Use "stripe" or "razorpay"');
    }

    if (!shippingAddressId) {
      throw new ValidationError('Shipping address is required');
    }

    // Validate addresses exist
    const shippingAddress = await prisma.address.findFirst({
      where: { id: shippingAddressId, userId },
    });

    if (!shippingAddress) {
      throw new NotFoundError('Shipping address not found');
    }

    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    // Validate stock and calculate totals
    let subtotal = 0;
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new ValidationError(`${item.product.name} has only ${item.product.stock} items in stock`);
      }
      subtotal += item.product.price * item.quantity;
    }

    const shippingCost = subtotal >= 999 ? 0 : 99; // Free shipping above ₹999
    const total = subtotal + shippingCost;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: paymentGateway,
        subtotal,
        shippingCost,
        total,
        shippingAddressId,
        billingAddressId: billingAddressId || shippingAddressId,
        items: {
          create: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            colorId: item.colorId,
            sizeId: item.sizeId,
          })),
        },
      },
    });

    let clientSecret: string | null = null;
    let razorpayOrderId: string | null = null;

    // Create payment intent based on gateway
    if (paymentGateway === 'stripe') {
      if (!isStripeEnabled || !stripe) {
        throw new ValidationError('Stripe is not configured');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: formatAmountForStripe(total),
        currency: 'inr',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId,
        },
      });

      clientSecret = paymentIntent.client_secret;

      // Update order with payment intent ID
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentId: paymentIntent.id },
      });
    } else if (paymentGateway === 'razorpay') {
      if (!isRazorpayEnabled || !razorpay) {
        throw new ValidationError('Razorpay is not configured');
      }

      const razorpayOrder = await razorpay.orders.create({
        amount: formatAmountForRazorpay(total),
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          userId,
        },
      });

      razorpayOrderId = razorpayOrder.id;

      // Update order with Razorpay order ID
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentId: razorpayOrder.id },
      });
    }

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
      ...(clientSecret && { clientSecret }),
      ...(razorpayOrderId && { razorpayOrderId }),
      gateway: paymentGateway,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/confirm
 * Confirm Razorpay payment (Stripe uses webhooks)
 */
router.post('/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { orderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!orderId || !razorpayPaymentId) {
      throw new ValidationError('Order ID and payment ID are required');
    }

    // Find order
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify Razorpay signature (if provided)
    if (razorpaySignature && razorpay) {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${order.paymentId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        throw new ValidationError('Invalid payment signature');
      }
    }

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentId: razorpayPaymentId,
      },
    });

    // Update product stock
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          salesCount: { increment: item.quantity },
        },
      });
    }

    // Clear user's cart
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    res.json({
      success: true,
      message: 'Payment confirmed',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
