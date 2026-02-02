import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/clerk-sdk-node';
import prisma from '../lib/prisma';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      clerkId?: string;
      user?: {
        id: string;
        clerkId: string;
        email: string;
        name: string | null;
        imageUrl: string | null;
        role: string;
      };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized - No token provided', code: 'NO_TOKEN' }
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token with Clerk
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY || '',
    });

    if (!session || !session.sub) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized - Invalid token', code: 'INVALID_TOKEN' }
      });
      return;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: session.sub },
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        imageUrl: true,
        role: true,
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' }
      });
      return;
    }

    // Attach user info to request
    req.userId = user.id;
    req.clerkId = user.clerkId;
    req.user = user;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: { message: 'Unauthorized', code: 'AUTH_ERROR' }
    });
  }
}

// Optional auth - doesn't fail if no token, but attaches user if present
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY || '',
    });

    if (session && session.sub) {
      const user = await prisma.user.findUnique({
        where: { clerkId: session.sub },
        select: {
          id: true,
          clerkId: true,
          email: true,
          name: true,
          imageUrl: true,
          role: true,
        }
      });

      if (user) {
        req.userId = user.id;
        req.clerkId = user.clerkId;
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
}

export default requireAuth;
