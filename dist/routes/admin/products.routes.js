"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const cloudinary_1 = require("../../lib/cloudinary");
const router = (0, express_1.Router)();
// Configure multer for memory storage (multiple images)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    },
});
router.use(auth_middleware_1.requireAuth);
router.use(admin_middleware_1.requireAdmin);
// GET /api/admin/products - List all products
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '20', search, category } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (category) {
            where.categoryId = category;
        }
        const [products, totalCount] = await Promise.all([
            prisma_1.default.product.findMany({
                where,
                include: {
                    category: true,
                    images: { take: 1 },
                    _count: {
                        select: { orderItems: true, reviews: true }
                    }
                },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.product.count({ where })
        ]);
        res.json({
            products,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalCount,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/admin/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const product = await prisma_1.default.product.findUnique({
            where: { id },
            include: {
                category: true,
                images: true,
                colors: true,
                sizes: true,
                variants: true
            }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/admin/products - Create product
router.post('/', async (req, res) => {
    try {
        const { name, slug, description, price, comparePrice, stock, categoryId, images, colors, sizes, isActive = true, isFeatured = false } = req.body;
        if (!name || !slug || !price || !categoryId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Check if slug already exists
        const existingProduct = await prisma_1.default.product.findUnique({
            where: { slug }
        });
        if (existingProduct) {
            return res.status(400).json({ error: 'Product with this slug already exists' });
        }
        const product = await prisma_1.default.product.create({
            data: {
                name,
                slug,
                description: description || '',
                price,
                comparePrice,
                stock: stock || 0,
                categoryId,
                isActive,
                isFeatured,
                images: images ? {
                    create: images.map((img, index) => ({
                        url: img.url,
                        order: index
                    }))
                } : undefined,
                colors: colors ? {
                    create: colors.map((color) => ({
                        name: color.name,
                        hexCode: color.hexCode
                    }))
                } : undefined,
                sizes: sizes ? {
                    create: sizes.map((size) => ({
                        name: size.name
                    }))
                } : undefined
            },
            include: {
                category: true,
                images: true,
                colors: true,
                sizes: true
            }
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Multer error handler wrapper
const handleMulterError = (req, res, next) => {
    upload.array('images', 10)(req, res, (err) => {
        if (err) {
            console.error('[Upload] Multer error:', err.message || err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 5MB per file.' });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
            }
            return res.status(400).json({ error: err.message || 'File upload error' });
        }
        next();
    });
};
// POST /api/admin/products/upload - Create product with image upload
router.post('/upload', handleMulterError, async (req, res) => {
    try {
        console.log('[Upload] Request received');
        console.log('[Upload] Files count:', req.files ? req.files.length : 0);
        console.log('[Upload] Body keys:', Object.keys(req.body));
        // Parse the data from JSON string
        const data = req.body.data ? JSON.parse(req.body.data) : req.body;
        console.log('[Upload] Parsed data:', JSON.stringify(data, null, 2));
        const { name, slug, description, shortDescription, price, comparePrice, costPrice, stock, lowStockAlert, categoryId, brand, material, pattern, occasion, careInstructions, weight, length, width, height, blouseIncluded, colors, sizes, isActive = true, isFeatured = false } = data;
        if (!name || !slug || !price || !categoryId) {
            return res.status(400).json({ error: 'Name, slug, price, and categoryId are required' });
        }
        // Check if slug already exists
        const existingProduct = await prisma_1.default.product.findUnique({
            where: { slug }
        });
        if (existingProduct) {
            return res.status(400).json({ error: 'Product with this slug already exists' });
        }
        // Upload images to Cloudinary if provided
        const uploadedImages = [];
        if (req.files && Array.isArray(req.files)) {
            console.log('[Upload] Starting Cloudinary uploads for', req.files.length, 'files');
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                console.log(`[Upload] Uploading file ${i + 1}:`, file.originalname, file.size, 'bytes');
                try {
                    const result = await (0, cloudinary_1.uploadImage)(file.buffer, 'products');
                    console.log(`[Upload] File ${i + 1} uploaded successfully:`, result.secure_url);
                    uploadedImages.push({
                        url: result.secure_url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                        isPrimary: i === 0 // First image is primary
                    });
                }
                catch (uploadError) {
                    console.error(`[Upload] Error uploading file ${i + 1} to Cloudinary:`, uploadError.message || uploadError);
                    // Continue with other images even if one fails
                }
            }
            console.log('[Upload] Cloudinary uploads complete. Successful:', uploadedImages.length);
        }
        // Build dimensions object only if all dimensions are provided (required by schema)
        const dimensions = (length && width && height) ? {
            create: {
                length: parseFloat(length),
                width: parseFloat(width),
                height: parseFloat(height)
            }
        } : undefined;
        // Parse colors and sizes if they're strings
        const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
        const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
        // Handle occasion - can be plain string, JSON array string, or array
        let parsedOccasion = [];
        if (typeof occasion === 'string') {
            try {
                parsedOccasion = JSON.parse(occasion);
            }
            catch {
                // If not valid JSON, treat as single value
                parsedOccasion = occasion.trim() ? [occasion.trim()] : [];
            }
        }
        else if (Array.isArray(occasion)) {
            parsedOccasion = occasion;
        }
        const product = await prisma_1.default.product.create({
            data: {
                name,
                slug,
                description: description || '',
                shortDescription,
                price: parseFloat(price),
                comparePrice: comparePrice ? parseFloat(comparePrice) : null,
                costPrice: costPrice ? parseFloat(costPrice) : null,
                stock: stock ? parseInt(stock) : 0,
                lowStockAlert: lowStockAlert ? parseInt(lowStockAlert) : 10,
                categoryId,
                brand,
                material,
                pattern,
                occasion: parsedOccasion,
                careInstructions,
                weight: weight ? parseFloat(weight) : null,
                dimensions,
                blouseIncluded: blouseIncluded === true || blouseIncluded === 'true',
                isActive: isActive === true || isActive === 'true',
                isFeatured: isFeatured === true || isFeatured === 'true',
                images: uploadedImages.length > 0 ? {
                    create: uploadedImages.map((img, index) => ({
                        url: img.url,
                        publicId: img.publicId,
                        width: img.width,
                        height: img.height,
                        format: img.format,
                        isPrimary: img.isPrimary,
                        order: index
                    }))
                } : undefined,
                colors: parsedColors && parsedColors.length > 0 ? {
                    create: parsedColors.map((color) => ({
                        name: color.name,
                        hexCode: color.hexCode
                    }))
                } : undefined,
                sizes: parsedSizes && parsedSizes.length > 0 ? {
                    create: parsedSizes.map((size) => ({
                        name: size.name
                    }))
                } : undefined
            },
            include: {
                category: true,
                images: true,
                colors: true,
                sizes: true,
                dimensions: true
            }
        });
        console.log('[Upload] Product created successfully:', product.id);
        res.status(201).json(product);
    }
    catch (error) {
        console.error('[Upload] Error creating product:', error.message || error);
        console.error('[Upload] Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message // Always show error message for debugging
        });
    }
});
// PATCH /api/admin/products/:id - Update product
router.patch('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = req.body;
        // Remove nested data that needs special handling
        const { images, colors, sizes, ...productData } = updateData;
        const product = await prisma_1.default.product.update({
            where: { id },
            data: productData,
            include: {
                category: true,
                images: true,
                colors: true,
                sizes: true
            }
        });
        res.json(product);
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /api/admin/products/:id - Delete product
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // Check if product has orders
        const orderCount = await prisma_1.default.orderItem.count({
            where: { productId: id }
        });
        if (orderCount > 0) {
            // Soft delete - just deactivate
            await prisma_1.default.product.update({
                where: { id },
                data: { isActive: false }
            });
            return res.json({ message: 'Product deactivated (has orders)' });
        }
        // Hard delete if no orders
        await prisma_1.default.product.delete({
            where: { id }
        });
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=products.routes.js.map