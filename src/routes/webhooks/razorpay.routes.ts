import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../../lib/prisma';

const router = Router();

// Razorpay webhook handler
router.post('/', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Razorpay webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`Razorpay webhook received: ${event}`);

    switch (event) {
      case 'payment.captured': {
        const payment = payload.payment.entity;
        const orderId = payment.notes?.orderId;

        if (orderId) {
          // Update order status
          const order = await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'CONFIRMED',
              paymentStatus: 'PAID',
              paymentId: payment.id
            }
          });

          // Clear user's cart
          if (order.userId) {
            await prisma.cartItem.deleteMany({
              where: { cart: { userId: order.userId } }
            });
          }

          // Update product stock
          const orderItems = await prisma.orderItem.findMany({
            where: { orderId: order.id }
          });

          for (const item of orderItems) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: item.quantity }
              }
            });
          }

          console.log(`Order ${order.orderNumber} payment captured`);
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment.entity;
        const orderId = payment.notes?.orderId;

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'CANCELLED',
              paymentStatus: 'FAILED'
            }
          });

          console.log(`Order ${orderId} payment failed`);
        }
        break;
      }

      case 'refund.created': {
        const refund = payload.refund.entity;
        const paymentId = refund.payment_id;

        const order = await prisma.order.findFirst({
          where: { paymentId }
        });

        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'REFUNDED',
              paymentStatus: 'REFUNDED'
            }
          });

          console.log(`Order ${order.orderNumber} refunded`);
        }
        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
