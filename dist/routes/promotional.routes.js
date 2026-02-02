"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// GET /api/promotional-data - Get promotional content
router.get('/', async (req, res) => {
    try {
        // Get promotional banners
        const promotionalData = await prisma_1.default.promotionalBanner.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
        // If no promotional data in database, return defaults
        if (promotionalData.length === 0) {
            return res.json({
                banners: [
                    {
                        id: '1',
                        title: 'Summer Sale',
                        description: 'Up to 50% off on selected items',
                        image: '/images/promo-1.jpg',
                        link: '/products?sale=true',
                        backgroundColor: '#FFF5E6'
                    },
                    {
                        id: '2',
                        title: 'New Arrivals',
                        description: 'Check out our latest collection',
                        image: '/images/promo-2.jpg',
                        link: '/products?sort=newest',
                        backgroundColor: '#E6F5FF'
                    }
                ],
                offers: [
                    {
                        id: '1',
                        title: 'Free Shipping',
                        description: 'On orders above ₹999',
                        icon: 'truck'
                    },
                    {
                        id: '2',
                        title: 'Easy Returns',
                        description: '7 days return policy',
                        icon: 'refresh'
                    },
                    {
                        id: '3',
                        title: 'Secure Payment',
                        description: '100% secure checkout',
                        icon: 'shield'
                    }
                ]
            });
        }
        res.json({ banners: promotionalData });
    }
    catch (error) {
        console.error('Error fetching promotional data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=promotional.routes.js.map