"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// GET /api/products - List products with filters and pagination
router.get('/', async (req, res) => {
    try {
        const { category, sort = 'newest', minPrice = '0', maxPrice = '999999', inStock, page = '1', limit = '12' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const minPriceNum = parseInt(minPrice);
        const maxPriceNum = parseInt(maxPrice);
        // Build where clause
        const where = {
            isActive: true
        };
        if (category) {
            const categoryRecord = await prisma_1.default.category.findUnique({
                where: { slug: category },
                select: { id: true }
            });
            if (categoryRecord) {
                where.categoryId = categoryRecord.id;
            }
        }
        if (minPriceNum > 0 || maxPriceNum < 999999) {
            where.price = {
                gte: minPriceNum,
                lte: maxPriceNum
            };
        }
        if (inStock === 'true') {
            where.stock = { gt: 0 };
        }
        // Build orderBy
        let orderBy = {};
        switch (sort) {
            case 'price-low':
                orderBy = { price: 'asc' };
                break;
            case 'price-high':
                orderBy = { price: 'desc' };
                break;
            case 'popular':
                orderBy = { orderItems: { _count: 'desc' } };
                break;
            case 'rating':
                orderBy = { reviews: { _count: 'desc' } };
                break;
            case 'newest':
            default:
                orderBy = { createdAt: 'desc' };
        }
        // Get total count
        const totalCount = await prisma_1.default.product.count({ where });
        // Get products
        const products = await prisma_1.default.product.findMany({
            where,
            select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                comparePrice: true,
                stock: true,
                createdAt: true,
                images: {
                    select: { url: true },
                    take: 1
                },
                category: {
                    select: {
                        name: true,
                        slug: true
                    }
                },
                _count: {
                    select: {
                        reviews: true,
                        orderItems: true
                    }
                }
            },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy
        });
        const formattedProducts = products.map(product => ({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            comparePrice: product.comparePrice || product.price * 1.3,
            rating: product._count.reviews > 0 ? 4.5 : 0,
            reviews: product._count.reviews,
            image: product.images[0]?.url || '/images/placeholder-product.jpg',
            colors: ['#000000'],
            category: product.category,
            stock: product.stock,
            isNew: new Date(product.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000),
            isBestseller: product._count.orderItems > 10,
            inStock: product.stock > 0
        }));
        const totalPages = Math.ceil(totalCount / limitNum);
        res.json({
            products: formattedProducts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalCount,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        });
    }
    catch (error) {
        console.error('Products API error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/products/featured - Get featured products
router.get('/featured', async (req, res) => {
    try {
        const products = await prisma_1.default.product.findMany({
            where: {
                isActive: true,
                isFeatured: true
            },
            select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                comparePrice: true,
                stock: true,
                images: {
                    select: { url: true },
                    take: 1
                },
                category: {
                    select: { name: true, slug: true }
                },
                _count: {
                    select: { reviews: true }
                }
            },
            take: 8,
            orderBy: { createdAt: 'desc' }
        });
        const formattedProducts = products.map(product => ({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            comparePrice: product.comparePrice || product.price * 1.3,
            rating: product._count.reviews > 0 ? 4.5 : 0,
            reviews: product._count.reviews,
            image: product.images[0]?.url || '/images/placeholder-product.jpg',
            category: product.category,
            inStock: product.stock > 0
        }));
        res.json(formattedProducts);
    }
    catch (error) {
        console.error('Featured products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/products/:slug - Get single product by slug
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const product = await prisma_1.default.product.findUnique({
            where: { slug },
            include: {
                images: true,
                colors: true,
                sizes: true,
                category: true,
                reviews: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                imageUrl: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                _count: {
                    select: { reviews: true }
                }
            }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Calculate average rating
        const avgRating = product.reviews.length > 0
            ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
            : 0;
        res.json({
            ...product,
            avgRating,
            reviewCount: product._count.reviews
        });
    }
    catch (error) {
        console.error('Product detail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=products.routes.js.map