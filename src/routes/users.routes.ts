import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/users/:clerkId/metadata - Get user metadata by Clerk ID
router.get('/:clerkId/metadata', async (req: Request, res: Response) => {
  try {
    const clerkId = req.params.clerkId as string;

    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        role: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      role: user.role,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('Error fetching user metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
