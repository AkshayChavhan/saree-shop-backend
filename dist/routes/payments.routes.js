"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const stripe_1 = __importDefault(require("../lib/stripe"));
const razorpay_1 = __importDefault(require("../lib/razorpay"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All payment routes require authentication
router.use(auth_middleware_1.requireAuth);
// POST /api/payments/create-intent - Create payment intent
router.post('/create-intent', async (req, res) => {
    try {
        const userId = req.userId;
        const { paymentGateway, shippingAddressId, billingAddressId } = req.body;
        if (!shippingAddressId) {
            return res.status(400).json({ error: 'Shipping address is required' });
        }
        // Get user's cart
        const cart = await prisma_1.default.cart.findUnique({
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
        const order = await prisma_1.default.order.create({
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
        if (paymentGateway === 'stripe' && stripe_1.default) {
            const paymentIntent = await stripe_1.default.paymentIntents.create({
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
        if (paymentGateway === 'razorpay' && razorpay_1.default) {
            const razorpayOrder = await razorpay_1.default.orders.create({
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
    }
    catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/payments/confirm - Confirm payment
router.post('/confirm', async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, paymentId, gateway } = req.body;
        const order = await prisma_1.default.order.findFirst({
            where: { id: orderId, userId }
        });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Update order status
        await prisma_1.default.order.update({
            where: { id: orderId },
            data: {
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
                paymentId
            }
        });
        // Clear cart
        await prisma_1.default.cartItem.deleteMany({
            where: {
                cart: { userId }
            }
        });
        res.json({ success: true, message: 'Payment confirmed' });
    }
    catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=payments.routes.js.map