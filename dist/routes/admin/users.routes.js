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
// GET /api/admin/users - List all users
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '20', search } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const where = {};
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [users, totalCount] = await Promise.all([
            prisma_1.default.user.findMany({
                where,
                select: {
                    id: true,
                    clerkId: true,
                    email: true,
                    name: true,
                    phone: true,
                    imageUrl: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: { orders: true, reviews: true }
                    }
                },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.user.count({ where })
        ]);
        res.json({
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalCount,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/admin/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.default.user.findUnique({
            where: { id },
            include: {
                orders: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                },
                addresses: true,
                _count: {
                    select: { orders: true, reviews: true }
                }
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// PATCH /api/admin/users/:id - Update user role
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        // Only super admin can promote to super admin
        if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Only super admin can promote to super admin' });
        }
        const user = await prisma_1.default.user.update({
            where: { id },
            data: { role }
        });
        res.json(user);
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /api/admin/users/:id - Delete user (Super Admin only)
router.delete('/:id', admin_middleware_1.requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Don't allow deleting self
        if (id === req.userId) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }
        await prisma_1.default.user.delete({
            where: { id }
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=users.routes.js.map