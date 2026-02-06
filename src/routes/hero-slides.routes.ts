import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Get frontend URL for absolute image paths
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://saakie.vercel.app';

// GET /api/hero-slides - Get hero slides for homepage
router.get('/', async (req: Request, res: Response) => {
  try {
    const heroSlides = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });

    // If no slides in database, return default slides with absolute URLs
    if (heroSlides.length === 0) {
      return res.json([
        {
          id: '1',
          title: 'Exquisite Silk Sarees',
          subtitle: 'Handcrafted with Love',
          description: 'Discover our collection of premium silk sarees',
          image: `${FRONTEND_URL}/images/hero-1.jpg`,
          ctaText: 'Shop Now',
          ctaLink: '/products?category=silk',
          order: 1
        },
        {
          id: '2',
          title: 'Wedding Collection',
          subtitle: 'For Your Special Day',
          description: 'Elegant bridal sarees for your memorable moments',
          image: `${FRONTEND_URL}/images/hero-2.jpg`,
          ctaText: 'Explore',
          ctaLink: '/products?category=wedding',
          order: 2
        }
      ]);
    }

    res.json(heroSlides);
  } catch (error) {
    console.error('Error fetching hero slides:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
