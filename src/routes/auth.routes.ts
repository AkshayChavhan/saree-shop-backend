import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * GET /api/auth/check-role
 * Check user's role and return user info
 */
router.get('/check-role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isAdmin: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
        isSuperAdmin: user.role === 'SUPER_ADMIN',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
