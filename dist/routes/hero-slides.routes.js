"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// GET /api/hero-slides - Get hero slides for homepage
router.get('/', async (req, res) => {
    try {
        const heroSlides = await prisma_1.default.heroSlide.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
        // If no slides in database, return default slides
        if (heroSlides.length === 0) {
            return res.json([
                {
                    id: '1',
                    title: 'Exquisite Silk Sarees',
                    subtitle: 'Handcrafted with Love',
                    description: 'Discover our collection of premium silk sarees',
                    image: '/images/hero-1.jpg',
                    ctaText: 'Shop Now',
                    ctaLink: '/products?category=silk',
                    order: 1
                },
                {
                    id: '2',
                    title: 'Wedding Collection',
                    subtitle: 'For Your Special Day',
                    description: 'Elegant bridal sarees for your memorable moments',
                    image: '/images/hero-2.jpg',
                    ctaText: 'Explore',
                    ctaLink: '/products?category=wedding',
                    order: 2
                }
            ]);
        }
        res.json(heroSlides);
    }
    catch (error) {
        console.error('Error fetching hero slides:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=hero-slides.routes.js.map