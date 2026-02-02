"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All wishlist routes require authentication
router.use(auth_middleware_1.requireAuth);
// GET /api/wishlist - Get user's wishlist
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        let wishlist = await prisma_1.default.wishlist.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                images: { take: 1 },
                                category: true
                            }
                        }
                    }
                }
            }
        });
        if (!wishlist) {
            wishlist = await prisma_1.default.wishlist.create({
                data: { userId },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    images: { take: 1 },
                                    category: true
                                }
                            }
                        }
                    }
                }
            });
        }
        res.json(wishlist);
    }
    catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/wishlist - Add item to wishlist
router.post('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        // Check if product exists
        const product = await prisma_1.default.product.findUnique({
            where: { id: productId }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Get or create wishlist
        let wishlist = await prisma_1.default.wishlist.findUnique({
            where: { userId }
        });
        if (!wishlist) {
            wishlist = await prisma_1.default.wishlist.create({
                data: { userId }
            });
        }
        // Check if item already in wishlist
        const existingItem = await prisma_1.default.wishlistItem.findFirst({
            where: {
                wishlistId: wishlist.id,
                productId
            }
        });
        if (existingItem) {
            return res.status(400).json({ error: 'Product already in wishlist' });
        }
        // Add item to wishlist
        await prisma_1.default.wishlistItem.create({
            data: {
                wishlistId: wishlist.id,
                productId
            }
        });
        // Return updated wishlist
        const updatedWishlist = await prisma_1.default.wishlist.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                images: { take: 1 },
                                category: true
                            }
                        }
                    }
                }
            }
        });
        res.json(updatedWishlist);
    }
    catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /api/wishlist/:productId - Remove item from wishlist
router.delete('/:productId', async (req, res) => {
    try {
        const userId = req.userId;
        const { productId } = req.params;
        const wishlist = await prisma_1.default.wishlist.findUnique({
            where: { userId }
        });
        if (!wishlist) {
            return res.status(404).json({ error: 'Wishlist not found' });
        }
        // Delete the item
        await prisma_1.default.wishlistItem.deleteMany({
            where: {
                wishlistId: wishlist.id,
                productId
            }
        });
        res.json({ message: 'Item removed from wishlist' });
    }
    catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=wishlist.routes.js.map