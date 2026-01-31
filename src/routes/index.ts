import { Router } from 'express';
import productsRoutes from './products.routes';
import categoriesRoutes from './categories.routes';
import cartRoutes from './cart.routes';
import ordersRoutes from './orders.routes';
import wishlistRoutes from './wishlist.routes';
import paymentsRoutes from './payments.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin';
import webhooksRoutes from './webhooks';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);

// ============================================
// PROTECTED ROUTES (User authentication required)
// ============================================
router.use('/cart', requireAuth, cartRoutes);
router.use('/orders', requireAuth, ordersRoutes);
router.use('/wishlist', requireAuth, wishlistRoutes);
router.use('/payments', requireAuth, paymentsRoutes);
router.use('/auth', requireAuth, authRoutes);

// ============================================
// ADMIN ROUTES (Admin role required)
// ============================================
router.use('/admin', requireAuth, requireAdmin, adminRoutes);

// ============================================
// WEBHOOK ROUTES (Signature verification, no auth)
// ============================================
router.use('/webhooks', webhooksRoutes);

export default router;
