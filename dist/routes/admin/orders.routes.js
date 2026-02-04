"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.use(admin_middleware_1.requireAdmin);
// GET /api/admin/orders - List all orders
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '20', status, paymentStatus } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const where = {};
        if (status) {
            where.status = status;
        }
        if (paymentStatus) {
            where.paymentStatus = paymentStatus;
        }
        const [orders, totalCount] = await Promise.all([
            prisma_1.default.order.findMany({
                where,
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    items: {
                        include: {
                            product: {
                                select: { name: true }
                            }
                        }
                    },
                    shippingAddress: true
                },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.order.count({ where })
        ]);
        res.json({
            orders,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalCount,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/admin/orders/:id - Get order by ID
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const order = await prisma_1.default.order.findUnique({
            where: { id },
            include: {
                user: true,
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
    }
    catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// PATCH /api/admin/orders/:id - Update order status
router.patch('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { status, paymentStatus, trackingNumber, notes } = req.body;
        const updateData = {};
        if (status) {
            const validStatuses = [
                'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED',
                'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'
            ];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }
            updateData.status = status;
            // Set delivered at timestamp
            if (status === 'DELIVERED') {
                updateData.deliveredAt = new Date();
            }
        }
        if (paymentStatus) {
            const validPaymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'];
            if (!validPaymentStatuses.includes(paymentStatus)) {
                return res.status(400).json({ error: 'Invalid payment status' });
            }
            updateData.paymentStatus = paymentStatus;
        }
        if (trackingNumber) {
            updateData.trackingNumber = trackingNumber;
        }
        if (notes) {
            updateData.notes = notes;
        }
        const order = await prisma_1.default.order.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: { name: true, email: true }
                },
                items: true
            }
        });
        res.json(order);
    }
    catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=orders.routes.js.map