import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /api/auth/check-role - Check user role
router.get('/check-role', optionalAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.json({
        isAuthenticated: false,
        role: null,
        isAdmin: false,
        isSuperAdmin: false
      });
    }

    res.json({
      isAuthenticated: true,
      role: req.user.role,
      isAdmin: req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN',
      isSuperAdmin: req.user.role === 'SUPER_ADMIN',
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      }
    });
  } catch (error) {
    console.error('Error checking role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
