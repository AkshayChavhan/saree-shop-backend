import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError, ForbiddenError } from '../../middleware/error.middleware';
import { requireSuperAdmin } from '../../middleware/admin.middleware';

const router = Router();

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', role, search } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
          role: true,
          createdAt: true,
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        role: user.role,
        orderCount: user._count.orders,
        createdAt: user.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user role
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentUser = req.user!;

    if (!role || !['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new ValidationError('Invalid role. Must be USER, ADMIN, or SUPER_ADMIN');
    }

    // Only SUPER_ADMIN can promote to SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only Super Admin can promote users to Super Admin');
    }

    // Prevent self-demotion for SUPER_ADMIN
    if (currentUser.id === id && currentUser.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Cannot demote yourself from Super Admin');
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: 'User role updated',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user (Super Admin only)
 */
router.delete('/:id', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    if (currentUser.id === id) {
      throw new ForbiddenError('Cannot delete your own account');
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Delete related data in transaction
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cart: { userId: id } } }),
      prisma.cart.deleteMany({ where: { userId: id } }),
      prisma.wishlistItem.deleteMany({ where: { wishlist: { userId: id } } }),
      prisma.wishlist.deleteMany({ where: { userId: id } }),
      prisma.review.deleteMany({ where: { userId: id } }),
      prisma.address.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.json({
      success: true,
      message: 'User deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
