"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("../../lib/stripe"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const router = (0, express_1.Router)();
// Stripe webhook handler
router.post('/', async (req, res) => {
    try {
        if (!stripe_1.default) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('STRIPE_WEBHOOK_SECRET not configured');
            return res.status(500).json({ error: 'Webhook not configured' });
        }
        const sig = req.headers['stripe-signature'];
        let event;
        try {
            event = stripe_1.default.webhooks.constructEvent(JSON.stringify(req.body), sig, webhookSecret);
        }
        catch (err) {
            console.error('Stripe webhook signature verification failed:', err.message);
            return res.status(400).json({ error: `Webhook Error: ${err.message}` });
        }
        console.log(`Stripe webhook received: ${event.type}`);
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const orderId = paymentIntent.metadata?.orderId;
                if (orderId) {
                    // Update order status
                    const order = await prisma_1.default.order.update({
                        where: { id: orderId },
                        data: {
                            status: 'CONFIRMED',
                            paymentStatus: 'PAID',
                            paymentId: paymentIntent.id
                        }
                    });
                    // Clear user's cart
                    if (order.userId) {
                        await prisma_1.default.cartItem.deleteMany({
                            where: { cart: { userId: order.userId } }
                        });
                    }
                    // Update product stock
                    const orderItems = await prisma_1.default.orderItem.findMany({
                        where: { orderId: order.id }
                    });
                    for (const item of orderItems) {
                        await prisma_1.default.product.update({
                            where: { id: item.productId },
                            data: {
                                stock: { decrement: item.quantity }
                            }
                        });
                    }
                    console.log(`Order ${order.orderNumber} payment succeeded`);
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                const orderId = paymentIntent.metadata?.orderId;
                if (orderId) {
                    await prisma_1.default.order.update({
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
            case 'charge.refunded': {
                const charge = event.data.object;
                const paymentIntentId = charge.payment_intent;
                const order = await prisma_1.default.order.findFirst({
                    where: { paymentId: paymentIntentId }
                });
                if (order) {
                    await prisma_1.default.order.update({
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
                console.log(`Unhandled Stripe event: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
exports.default = router;
//# sourceMappingURL=stripe.routes.js.map