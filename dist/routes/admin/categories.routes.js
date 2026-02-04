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
// GET /api/admin/categories - List all categories
router.get('/', async (req, res) => {
    try {
        const categories = await prisma_1.default.category.findMany({
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/admin/categories/:id - Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const category = await prisma_1.default.category.findUnique({
            where: { id },
            include: {
                products: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: { products: true }
                }
            }
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/admin/categories - Create category
router.post('/', async (req, res) => {
    try {
        const { name, slug, description, image, isActive = true } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required' });
        }
        // Check if slug already exists
        const existingCategory = await prisma_1.default.category.findUnique({
            where: { slug }
        });
        if (existingCategory) {
            return res.status(400).json({ error: 'Category with this slug already exists' });
        }
        const category = await prisma_1.default.category.create({
            data: {
                name,
                slug,
                description,
                image,
                isActive
            }
        });
        res.status(201).json(category);
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// PATCH /api/admin/categories/:id - Update category
router.patch('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { name, slug, description, image, isActive } = req.body;
        // Check if new slug already exists (if changing slug)
        if (slug) {
            const existingCategory = await prisma_1.default.category.findFirst({
                where: {
                    slug,
                    NOT: { id }
                }
            });
            if (existingCategory) {
                return res.status(400).json({ error: 'Category with this slug already exists' });
            }
        }
        const category = await prisma_1.default.category.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(slug && { slug }),
                ...(description !== undefined && { description }),
                ...(image !== undefined && { image }),
                ...(isActive !== undefined && { isActive })
            }
        });
        res.json(category);
    }
    catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /api/admin/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // Check if category has products
        const productCount = await prisma_1.default.product.count({
            where: { categoryId: id }
        });
        if (productCount > 0) {
            return res.status(400).json({
                error: `Cannot delete category with ${productCount} products. Move or delete products first.`
            });
        }
        await prisma_1.default.category.delete({
            where: { id }
        });
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=categories.routes.js.map