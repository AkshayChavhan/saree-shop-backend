"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const products_routes_1 = __importDefault(require("./routes/products.routes"));
const categories_routes_1 = __importDefault(require("./routes/categories.routes"));
const cart_routes_1 = __importDefault(require("./routes/cart.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const wishlist_routes_1 = __importDefault(require("./routes/wishlist.routes"));
const payments_routes_1 = __importDefault(require("./routes/payments.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const hero_slides_routes_1 = __importDefault(require("./routes/hero-slides.routes"));
const promotional_routes_1 = __importDefault(require("./routes/promotional.routes"));
// Admin routes
const dashboard_routes_1 = __importDefault(require("./routes/admin/dashboard.routes"));
const users_routes_2 = __importDefault(require("./routes/admin/users.routes"));
const products_routes_2 = __importDefault(require("./routes/admin/products.routes"));
const orders_routes_2 = __importDefault(require("./routes/admin/orders.routes"));
const categories_routes_2 = __importDefault(require("./routes/admin/categories.routes"));
// Webhook routes
const clerk_routes_1 = __importDefault(require("./routes/webhooks/clerk.routes"));
const stripe_routes_1 = __importDefault(require("./routes/webhooks/stripe.routes"));
const razorpay_routes_1 = __importDefault(require("./routes/webhooks/razorpay.routes"));
// Middleware
const error_middleware_1 = require("./middleware/error.middleware");
const masterKey_middleware_1 = require("./middleware/masterKey.middleware");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://saakie.vercel.app',
    process.env.FRONTEND_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
// Body parsing - Note: webhooks need raw body, so we handle that in webhook routes
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api', masterKey_middleware_1.requireMasterKey);
// Public routes
app.use('/api/products', products_routes_1.default);
app.use('/api/categories', categories_routes_1.default);
app.use('/api/hero-slides', hero_slides_routes_1.default);
app.use('/api/promotional-data', promotional_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', users_routes_1.default);
// Protected routes (require authentication)
app.use('/api/cart', cart_routes_1.default);
app.use('/api/orders', orders_routes_1.default);
app.use('/api/wishlist', wishlist_routes_1.default);
app.use('/api/payments', payments_routes_1.default);
// Admin routes
app.use('/api/admin/dashboard', dashboard_routes_1.default);
app.use('/api/admin/users', users_routes_2.default);
app.use('/api/admin/products', products_routes_2.default);
app.use('/api/admin/orders', orders_routes_2.default);
app.use('/api/admin/categories', categories_routes_2.default);
// Webhook routes (no auth required, signature verified)
app.use('/api/webhooks/clerk', clerk_routes_1.default);
app.use('/api/webhooks/stripe', stripe_routes_1.default);
app.use('/api/webhooks/razorpay', razorpay_routes_1.default);
// Error handler
app.use(error_middleware_1.errorHandler);
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
exports.default = app;
//# sourceMappingURL=index.js.map