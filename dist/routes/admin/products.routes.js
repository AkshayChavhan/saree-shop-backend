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
// GET /api/admin/products - List all products
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '20', search, category } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (category) {
            where.categoryId = category;
        }
        const [products, totalCount] = await Promise.all([
            prisma_1.default.product.findMany({
                where,
                include: {
                    category: true,
                    images: { take: 1 },
                    _count: {
                        select: { orderItems: true, reviews: true }
                    }
                },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.product.count({ where })
        ]);
        res.json({
            products,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalCount,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/admin/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const product = await prisma_1.default.product.findUnique({
            where: { id },
            include: {
                category: true,
                images: true,
                colors: true,
                sizes: true,
                variants: true
            }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/admin/products - Create product
router.post('/', async (req, res) => {
    try {
        const { name, slug, description, price, comparePrice, stock, categoryId, images, colors, sizes, isActive = true, isFeatured = false } = req.body;
        if (!name || !slug || !price || !categoryId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Check if slug already exists
        const existingProduct = await prisma_1.default.product.findUnique({
            where: { slug }
        });
        if (existingProduct) {
            return res.status(400).json({ error: 'Product with this slug already exists' });
        }
        const product = await prisma_1.default.product.create({
            data: {
                name,
                slug,
                description: description || '',
                price,
                comparePrice,
                stock: stock || 0,
                categoryId,
                isActive,
                isFeatured,
                images: images ? {
                    create: images.map((img, index) => ({
                        url: img.url,
                        order: index
                    }))
                } : undefined,
                colors: colors ? {
                    create: colors.map((color) => ({
                        name: color.name,
                        hexCode: color.hexCode
                    }))
                } : undefined,
                sizes: sizes ? {
                    create: sizes.map((size) => ({
                        name: size.name,
                        price: size.price
                    }))
                } : undefined
            },
            include: {
                category: true,
                images: true,
                colors: true,
                sizes: true
            }
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// PATCH /api/admin/products/:id - Update product
router.patch('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = req.body;
        // Remove nested data that needs special handling
        const { images, colors, sizes, ...productData } = updateData;
        const product = await prisma_1.default.product.update({
            where: { id },
            data: productData,
            include: {
                category: true,
                images: true,
                colors: true,
                sizes: true
            }
        });
        res.json(product);
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /api/admin/products/:id - Delete product
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // Check if product has orders
        const orderCount = await prisma_1.default.orderItem.count({
            where: { productId: id }
        });
        if (orderCount > 0) {
            // Soft delete - just deactivate
            await prisma_1.default.product.update({
                where: { id },
                data: { isActive: false }
            });
            return res.json({ message: 'Product deactivated (has orders)' });
        }
        // Hard delete if no orders
        await prisma_1.default.product.delete({
            where: { id }
        });
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=products.routes.js.map