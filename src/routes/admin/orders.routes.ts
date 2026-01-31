import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../middleware/error.middleware';

const router = Router();

const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
];

/**
 * GET /api/admin/orders
 * List all orders
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, paymentStatus, search } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            select: {
              quantity: true,
            },
          },
          shippingAddress: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: {
          email: order.user.email,
          name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email,
        },
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
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
 * GET /api/admin/orders/:id
 * Get single order with all details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: { take: 1 },
              },
            },
            color: true,
            size: true,
          },
        },
        shippingAddress: true,
        billingAddress: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    res.json({
      success: true,
      order: {
        ...order,
        items: order.items.map(item => ({
          id: item.id,
          product: {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            image: item.product.images[0]?.url || null,
          },
          quantity: item.quantity,
          price: item.price,
          color: item.color?.name,
          size: item.size?.name,
          itemTotal: item.price * item.quantity,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/orders/:id
 * Update order status
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, notes } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const updateData: any = {};

    if (status) {
      if (!ORDER_STATUSES.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`);
      }
      updateData.status = status;
    }

    if (paymentStatus) {
      if (!['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'].includes(paymentStatus)) {
        throw new ValidationError('Invalid payment status');
      }
      updateData.paymentStatus = paymentStatus;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Handle refund - restore stock
    if (status === 'REFUNDED' || status === 'CANCELLED') {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: id },
      });

      for (const item of orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            salesCount: { decrement: item.quantity },
          },
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    res.json({
      success: true,
      message: 'Order updated',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
