import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

const router = Router();

/**
 * POST /api/webhooks/razorpay
 * Handle Razorpay webhook events
 */
router.post('/', async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get signature from headers
  const signature = req.headers['x-razorpay-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing Razorpay signature' });
  }

  // Verify signature
  const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('Razorpay webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const eventType = event.event;

  console.log(`Razorpay webhook received: ${eventType}`);

  try {
    switch (eventType) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        const orderId = payment.notes?.orderId;

        if (orderId) {
          const order = await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'CONFIRMED',
              paymentStatus: 'PAID',
              paymentId: payment.id,
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

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        const orderId = payment.notes?.orderId;

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

      case 'refund.created': {
        const refund = event.payload.refund.entity;
        const paymentId = refund.payment_id;

        if (paymentId) {
          const order = await prisma.order.findFirst({
            where: { paymentId },
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

      case 'order.paid': {
        const razorpayOrder = event.payload.order.entity;
        const orderId = razorpayOrder.notes?.orderId;

        if (orderId) {
          // This is a backup check - payment.captured should handle this
          const order = await prisma.order.findUnique({ where: { id: orderId } });

          if (order && order.paymentStatus !== 'PAID') {
            await prisma.order.update({
              where: { id: orderId },
              data: {
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
              },
            });

            console.log(`Order ${orderId} marked as PAID via order.paid event`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
