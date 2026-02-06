import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { uploadImage, deleteImage } from '../../lib/cloudinary';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
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

// GET /api/admin/categories - List all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/categories/:id - Get category by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/categories - Create category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, image, isActive = true } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this slug already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
        isActive
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/categories/upload - Create category with image upload
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    // Parse the data from JSON string
    const data = req.body.data ? JSON.parse(req.body.data) : req.body;
    const { name, slug, description, parentId, isActive = true } = data;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this slug already exists' });
    }

    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;
    let imageWidth: number | null = null;
    let imageHeight: number | null = null;
    let imageFormat: string | null = null;

    // Upload image to Cloudinary if provided
    if (req.file) {
      try {
        const result = await uploadImage(req.file.buffer, 'categories') as any;
        imageUrl = result.secure_url;
        imagePublicId = result.public_id;
        imageWidth = result.width;
        imageHeight = result.height;
        imageFormat = result.format;
      } catch (uploadError) {
        console.error('Error uploading image to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image: imageUrl,
        imagePublicId,
        imageWidth,
        imageHeight,
        imageFormat,
        parentId: parentId || null,
        isActive
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category with upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/categories/:id - Update category
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, slug, description, image, isActive } = req.body;

    // Check if new slug already exists (if changing slug)
    if (slug) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          slug,
          NOT: { id }
        }
      });

      if (existingCategory) {
        return res.status(400).json({ error: 'Category with this slug already exists' });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/categories/:id - Delete category
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has child categories
    if (category._count.children > 0) {
      return res.status(400).json({
        error: `Cannot delete category with ${category._count.children} subcategories. Delete or reassign subcategories first.`
      });
    }

    // Check if category has products
    if (category._count.products > 0) {
      return res.status(400).json({
        error: `Cannot delete category with ${category._count.products} products. Move or delete products first.`
      });
    }

    // Delete the category image from Cloudinary if it exists
    if (category.imagePublicId) {
      try {
        await deleteImage(category.imagePublicId);
      } catch (deleteError) {
        console.error('Error deleting category image from Cloudinary:', deleteError);
        // Continue with deletion even if image deletion fails
      }
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
