import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import prisma from '../../lib/prisma';

const router = Router();

// Clerk webhook handler
router.post('/', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ error: 'Missing svix headers' });
    }

    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(JSON.stringify(req.body), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    const eventType = evt.type;
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    console.log(`Clerk webhook received: ${eventType}`);

    switch (eventType) {
      case 'user.created': {
        const email = email_addresses?.[0]?.email_address;

        if (!email) {
          console.error('No email found in user.created event');
          return res.status(400).json({ error: 'No email found' });
        }

        // Combine first and last name
        const name = [first_name, last_name].filter(Boolean).join(' ') || null;

        // Create user in database
        const user = await prisma.user.create({
          data: {
            clerkId: id,
            email,
            name,
            imageUrl: image_url || null,
            role: 'USER'
          }
        });

        // Create cart and wishlist for user
        await Promise.all([
          prisma.cart.create({ data: { userId: user.id } }),
          prisma.wishlist.create({ data: { userId: user.id } })
        ]);

        console.log(`User created: ${email}`);
        break;
      }

      case 'user.updated': {
        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(' ') || null;

        await prisma.user.update({
          where: { clerkId: id },
          data: {
            email: email || undefined,
            name,
            imageUrl: image_url || null
          }
        });

        console.log(`User updated: ${id}`);
        break;
      }

      case 'user.deleted': {
        // Delete user and related data
        const user = await prisma.user.findUnique({
          where: { clerkId: id }
        });

        if (user) {
          // Delete related data
          await prisma.cartItem.deleteMany({
            where: { cart: { userId: user.id } }
          });
          await prisma.cart.deleteMany({
            where: { userId: user.id }
          });
          await prisma.wishlistItem.deleteMany({
            where: { wishlist: { userId: user.id } }
          });
          await prisma.wishlist.deleteMany({
            where: { userId: user.id }
          });

          // Delete user
          await prisma.user.delete({
            where: { id: user.id }
          });

          console.log(`User deleted: ${id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
