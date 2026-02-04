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
// All admin routes require authentication and admin role
router.use(auth_middleware_1.requireAuth);
router.use(admin_middleware_1.requireAdmin);
// GET /api/admin/dashboard - Get dashboard stats
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // Get counts in parallel
        const [totalUsers, totalProducts, totalOrders, pendingOrders, lowStockProducts, monthlyOrders, newUsersThisMonth] = await Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.product.count({ where: { isActive: true } }),
            prisma_1.default.order.count(),
            prisma_1.default.order.count({ where: { status: 'PENDING' } }),
            prisma_1.default.product.count({ where: { stock: { lte: 10 }, isActive: true } }),
            prisma_1.default.order.findMany({
                where: {
                    createdAt: { gte: startOfMonth },
                    paymentStatus: 'PAID'
                },
                select: { total: true }
            }),
            prisma_1.default.user.count({
                where: { createdAt: { gte: startOfMonth } }
            })
        ]);
        // Calculate revenue
        const totalRevenue = await prisma_1.default.order.aggregate({
            where: { paymentStatus: 'PAID' },
            _sum: { total: true }
        });
        const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.total, 0);
        // Get recent orders
        const recentOrders = await prisma_1.default.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            }
        });
        res.json({
            stats: {
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue: totalRevenue._sum.total || 0,
                monthlyRevenue,
                pendingOrders,
                lowStockProducts,
                newUsersThisMonth
            },
            recentOrders
        });
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map