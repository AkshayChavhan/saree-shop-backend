import { Router, Request, Response } from 'express';
import { stripe } from '../../lib/stripe';
import { prisma } from '../../lib/prisma';
import Stripe from 'stripe';

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/', async (req: Request, res: Response) => {
  if (!stripe) {
    console.error('Stripe is not configured');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;

  try {
    // req.body should be raw buffer for Stripe webhooks
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(payload, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log(`Stripe webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
          // Update order status
          const order = await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'CONFIRMED',
              paymentStatus: 'PAID',
              paymentId: paymentIntent.id,
            },
            include: { items: true },
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
          const cart = await prisma.cart.findUnique({ where: { userId: order.userId } });
          if (cart) {
            await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
          }

          console.log(`Order ${order.orderNumber} marked as PAID`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'CANCELLED',
              paymentStatus: 'FAILED',
            },
          });

          console.log(`Order ${orderId} payment failed`);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'CANCELLED',
              paymentStatus: 'CANCELLED',
            },
          });

          console.log(`Order ${orderId} cancelled`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          const order = await prisma.order.findFirst({
            where: { paymentId: paymentIntentId },
            include: { items: true },
          });

          if (order) {
            // Restore stock
            for (const item of order.items) {
              await prisma.product.update({
                where: { id: item.productId },
                data: {
                  stock: { increment: item.quantity },
                  salesCount: { decrement: item.quantity },
                },
              });
            }

            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: 'REFUNDED',
                paymentStatus: 'REFUNDED',
              },
            });

            console.log(`Order ${order.orderNumber} refunded`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
