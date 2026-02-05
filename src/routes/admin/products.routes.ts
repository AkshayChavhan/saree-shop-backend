import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { uploadImage } from '../../lib/cloudinary';

const router = Router();

// Configure multer for memory storage (multiple images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/products - List all products
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, category } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (category) {
      where.categoryId = category;
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
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
      prisma.product.count({ where })
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
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/products/:id - Get product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const product = await prisma.product.findUnique({
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
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/products - Create product
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      comparePrice,
      stock,
      categoryId,
      images,
      colors,
      sizes,
      isActive = true,
      isFeatured = false
    } = req.body;

    if (!name || !slug || !price || !categoryId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if slug already exists
    const existingProduct = await prisma.product.findUnique({
      where: { slug }
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this slug already exists' });
    }

    const product = await prisma.product.create({
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
          create: images.map((img: { url: string }, index: number) => ({
            url: img.url,
            order: index
          }))
        } : undefined,
        colors: colors ? {
          create: colors.map((color: { name: string; hexCode: string }) => ({
            name: color.name,
            hexCode: color.hexCode
          }))
        } : undefined,
        sizes: sizes ? {
          create: sizes.map((size: { name: string }) => ({
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
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Multer error handler wrapper
const handleMulterError = (req: Request, res: Response, next: Function) => {
  upload.array('images', 10)(req, res, (err: any) => {
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
router.post('/upload', handleMulterError, async (req: Request, res: Response) => {
  try {
    console.log('[Upload] Request received');
    console.log('[Upload] Files count:', req.files ? (req.files as Express.Multer.File[]).length : 0);
    console.log('[Upload] Body keys:', Object.keys(req.body));

    // Parse the data from JSON string
    const data = req.body.data ? JSON.parse(req.body.data) : req.body;
    console.log('[Upload] Parsed data:', JSON.stringify(data, null, 2));
    const {
      name,
      slug,
      description,
      shortDescription,
      price,
      comparePrice,
      costPrice,
      stock,
      lowStockAlert,
      categoryId,
      brand,
      material,
      pattern,
      occasion,
      careInstructions,
      weight,
      length,
      width,
      height,
      blouseIncluded,
      colors,
      sizes,
      isActive = true,
      isFeatured = false
    } = data;

    if (!name || !slug || !price || !categoryId) {
      return res.status(400).json({ error: 'Name, slug, price, and categoryId are required' });
    }

    // Check if slug already exists
    const existingProduct = await prisma.product.findUnique({
      where: { slug }
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this slug already exists' });
    }

    // Upload images to Cloudinary if provided
    const uploadedImages: Array<{ url: string; publicId: string; width: number; height: number; format: string; isPrimary: boolean }> = [];

    if (req.files && Array.isArray(req.files)) {
      console.log('[Upload] Starting Cloudinary uploads for', req.files.length, 'files');
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        console.log(`[Upload] Uploading file ${i + 1}:`, file.originalname, file.size, 'bytes');
        try {
          const result = await uploadImage(file.buffer, 'products') as any;
          console.log(`[Upload] File ${i + 1} uploaded successfully:`, result.secure_url);
          uploadedImages.push({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            isPrimary: i === 0 // First image is primary
          });
        } catch (uploadError: any) {
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
    let parsedOccasion: string[] = [];
    if (typeof occasion === 'string') {
      try {
        parsedOccasion = JSON.parse(occasion);
      } catch {
        // If not valid JSON, treat as single value
        parsedOccasion = occasion.trim() ? [occasion.trim()] : [];
      }
    } else if (Array.isArray(occasion)) {
      parsedOccasion = occasion;
    }

    const product = await prisma.product.create({
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
          create: parsedColors.map((color: { name: string; hexCode: string }) => ({
            name: color.name,
            hexCode: color.hexCode
          }))
        } : undefined,
        sizes: parsedSizes && parsedSizes.length > 0 ? {
          create: parsedSizes.map((size: { name: string }) => ({
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
  } catch (error: any) {
    console.error('[Upload] Error creating product:', error.message || error);
    console.error('[Upload] Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message // Always show error message for debugging
    });
  }
});

// PATCH /api/admin/products/:id - Update product
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updateData = req.body;

    // Remove nested data that needs special handling
    const { images, colors, sizes, ...productData } = updateData;

    const product = await prisma.product.update({
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
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/products/:id - Delete product
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Check if product has orders
    const orderCount = await prisma.orderItem.count({
      where: { productId: id }
    });

    if (orderCount > 0) {
      // Soft delete - just deactivate
      await prisma.product.update({
        where: { id },
        data: { isActive: false }
      });
      return res.json({ message: 'Product deactivated (has orders)' });
    }

    // Hard delete if no orders
    await prisma.product.delete({
      where: { id }
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
