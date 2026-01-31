import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../../lib/prisma';

const router = Router();

interface ClerkWebhookEvent {
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    profile_image_url?: string;
    gender?: string;
  };
  type: string;
}

/**
 * POST /api/webhooks/clerk
 * Handle Clerk webhook events
 */
router.post('/', async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get Svix headers
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing Svix headers' });
  }

  // Get raw body
  const payload = req.body;
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle the event
  const eventType = evt.type;
  const { id, email_addresses, first_name, last_name, image_url, profile_image_url, gender } = evt.data;

  console.log(`Clerk webhook received: ${eventType}`);

  try {
    switch (eventType) {
      case 'user.created': {
        const email = email_addresses?.[0]?.email_address;
        if (!email) {
          console.error('No email in user.created event');
          return res.status(400).json({ error: 'No email provided' });
        }

        // Create user with cart and wishlist
        await prisma.user.create({
          data: {
            clerkId: id,
            email,
            firstName: first_name || null,
            lastName: last_name || null,
            imageUrl: image_url || profile_image_url || null,
            profileImageUrl: profile_image_url || null,
            gender: gender || null,
            role: 'USER',
            cart: { create: {} },
            wishlist: { create: {} },
          },
        });

        console.log(`User created: ${email}`);
        break;
      }

      case 'user.updated': {
        const email = email_addresses?.[0]?.email_address;

        await prisma.user.update({
          where: { clerkId: id },
          data: {
            email: email || undefined,
            firstName: first_name || undefined,
            lastName: last_name || undefined,
            imageUrl: image_url || profile_image_url || undefined,
            profileImageUrl: profile_image_url || undefined,
            gender: gender || undefined,
          },
        });

        console.log(`User updated: ${id}`);
        break;
      }

      case 'user.deleted': {
        // Delete user and all related data
        const user = await prisma.user.findUnique({ where: { clerkId: id } });

        if (user) {
          await prisma.$transaction([
            prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } }),
            prisma.cart.deleteMany({ where: { userId: user.id } }),
            prisma.wishlistItem.deleteMany({ where: { wishlist: { userId: user.id } } }),
            prisma.wishlist.deleteMany({ where: { userId: user.id } }),
            prisma.review.deleteMany({ where: { userId: user.id } }),
            prisma.address.deleteMany({ where: { userId: user.id } }),
            prisma.user.delete({ where: { id: user.id } }),
          ]);

          console.log(`User deleted: ${id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled Clerk event: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing Clerk webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
