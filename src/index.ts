import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import productRoutes from './routes/products.routes';
import categoryRoutes from './routes/categories.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/orders.routes';
import wishlistRoutes from './routes/wishlist.routes';
import paymentRoutes from './routes/payments.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import heroSlidesRoutes from './routes/hero-slides.routes';
import promotionalRoutes from './routes/promotional.routes';

// Admin routes
import adminDashboardRoutes from './routes/admin/dashboard.routes';
import adminUsersRoutes from './routes/admin/users.routes';
import adminProductsRoutes from './routes/admin/products.routes';
import adminOrdersRoutes from './routes/admin/orders.routes';
import adminCategoriesRoutes from './routes/admin/categories.routes';

// Webhook routes
import clerkWebhookRoutes from './routes/webhooks/clerk.routes';
import stripeWebhookRoutes from './routes/webhooks/stripe.routes';
import razorpayWebhookRoutes from './routes/webhooks/razorpay.routes';

// Middleware
import { errorHandler } from './middleware/error.middleware';
import { requireMasterKey } from './middleware/masterKey.middleware';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing - Note: webhooks need raw body, so we handle that in webhook routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (public, no master key required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===========================================
// MASTER API KEY AUTHENTICATION
// ===========================================
// Apply master key check to ALL API routes
// This runs BEFORE any other authentication middleware
// Configure MASTER_API_KEY in .env file
// Set BYPASS_MASTER_KEY=true in development to disable
app.use('/api', requireMasterKey);

// Public routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/hero-slides', heroSlidesRoutes);
app.use('/api/promotional-data', promotionalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// Protected routes (require authentication)
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payments', paymentRoutes);

// Admin routes
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/products', adminProductsRoutes);
app.use('/api/admin/orders', adminOrdersRoutes);
app.use('/api/admin/categories', adminCategoriesRoutes);

// Webhook routes (no auth required, signature verified)
app.use('/api/webhooks/clerk', clerkWebhookRoutes);
app.use('/api/webhooks/stripe', stripeWebhookRoutes);
app.use('/api/webhooks/razorpay', razorpayWebhookRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found', code: 'NOT_FOUND' }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
