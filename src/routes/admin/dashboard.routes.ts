import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Execute all queries in parallel
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenueResult,
      monthlyRevenueResult,
      pendingOrders,
      lowStockProducts,
      recentOrders,
      topProducts,
      newUsersThisMonth,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Total products
      prisma.product.count({ where: { isActive: true } }),

      // Total orders
      prisma.order.count(),

      // Total revenue (all time)
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
      }),

      // Monthly revenue
      prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),

      // Pending orders count
      prisma.order.count({
        where: { status: 'PENDING' },
      }),

      // Low stock products
      prisma.product.count({
        where: {
          isActive: true,
          stock: { lte: 5 },
        },
      }),

      // Recent orders
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),

      // Top selling products
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { salesCount: 'desc' },
        take: 5,
        include: {
          images: { take: 1 },
        },
      }),

      // New users this month
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenueResult._sum.total || 0,
        monthlyRevenue: monthlyRevenueResult._sum.total || 0,
        pendingOrders,
        lowStockProducts,
        newUsersThisMonth,
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: order.user
          ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email
          : 'Unknown',
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      })),
      topProducts: topProducts.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.images[0]?.url || null,
        price: product.price,
        salesCount: product.salesCount,
        stock: product.stock,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
