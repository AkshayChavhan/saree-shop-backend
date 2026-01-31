import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError, ConflictError } from '../../middleware/error.middleware';

const router = Router();

/**
 * Generate slug from name
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * GET /api/admin/products
 * List all products (including inactive)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', category, search, status } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const where: any = {};

    if (category) {
      where.categoryId = category;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          images: { take: 1 },
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        comparePrice: product.comparePrice,
        stock: product.stock,
        image: product.images[0]?.url || null,
        category: product.category?.name,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        salesCount: product.salesCount,
        createdAt: product.createdAt,
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
 * GET /api/admin/products/:id
 * Get single product with all details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        colors: true,
        sizes: true,
        variants: true,
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/products
 * Create new product
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      shortDescription,
      price,
      comparePrice,
      costPrice,
      sku,
      stock,
      categoryId,
      images,
      colors,
      sizes,
      material,
      pattern,
      occasion,
      isActive = true,
      isFeatured = false,
      isNew = false,
      isBestseller = false,
    } = req.body;

    if (!name || !description || !price || !categoryId) {
      throw new ValidationError('Name, description, price, and category are required');
    }

    // Generate unique slug
    let slug = generateSlug(name);
    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (existingProduct) {
      slug = `${slug}-${Date.now()}`;
    }

    // Check SKU uniqueness
    if (sku) {
      const existingSku = await prisma.product.findUnique({ where: { sku } });
      if (existingSku) {
        throw new ConflictError('SKU already exists');
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        shortDescription,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        sku,
        stock: parseInt(stock) || 0,
        categoryId,
        material,
        pattern,
        occasion,
        isActive,
        isFeatured,
        isNew,
        isBestseller,
        images: images?.length
          ? { create: images.map((url: string, index: number) => ({ url, order: index })) }
          : undefined,
        colors: colors?.length
          ? { create: colors.map((c: { name: string; hexCode: string }) => ({ name: c.name, hexCode: c.hexCode })) }
          : undefined,
        sizes: sizes?.length
          ? { create: sizes.map((s: { name: string }) => ({ name: s.name })) }
          : undefined,
      },
      include: {
        images: true,
        colors: true,
        sizes: true,
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Product created',
      product,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/products/:id
 * Update product
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Handle numeric fields
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.comparePrice) updateData.comparePrice = parseFloat(updateData.comparePrice);
    if (updateData.costPrice) updateData.costPrice = parseFloat(updateData.costPrice);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);

    // Don't update slug, images, colors, sizes directly
    delete updateData.slug;
    delete updateData.images;
    delete updateData.colors;
    delete updateData.sizes;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
        colors: true,
        sizes: true,
        category: true,
      },
    });

    res.json({
      success: true,
      message: 'Product updated',
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete product
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Delete related data in transaction
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.productColor.deleteMany({ where: { productId: id } }),
      prisma.productSize.deleteMany({ where: { productId: id } }),
      prisma.productVariant.deleteMany({ where: { productId: id } }),
      prisma.cartItem.deleteMany({ where: { productId: id } }),
      prisma.wishlistItem.deleteMany({ where: { productId: id } }),
      prisma.review.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    res.json({
      success: true,
      message: 'Product deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
