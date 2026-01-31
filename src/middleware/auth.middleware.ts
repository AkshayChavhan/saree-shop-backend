import { Request, Response, NextFunction } from 'express';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { prisma } from '../lib/prisma';

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

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
        firstName: string | null;
        lastName: string | null;
        role: string;
      };
    }
  }
}

/**
 * Middleware to require authentication
 * Verifies the JWT token from Clerk and attaches user info to request
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          message: 'No authorization token provided',
          code: 'NO_TOKEN'
        }
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Clerk
    let session;
    try {
      session = await clerkClient.verifyToken(token);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        }
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
        firstName: true,
        lastName: true,
        role: true,
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User not found in database',
          code: 'USER_NOT_FOUND'
        }
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
    res.status(500).json({
      success: false,
      error: {
        message: 'Authentication failed',
        code: 'AUTH_ERROR'
      }
    });
  }
};

/**
 * Optional auth middleware - doesn't fail if no token provided
 * Useful for routes that work differently for authenticated vs anonymous users
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const session = await clerkClient.verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { clerkId: session.sub },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        }
      });

      if (user) {
        req.userId = user.id;
        req.clerkId = user.clerkId;
        req.user = user;
      }
    } catch {
      // Token invalid, continue without user
    }

    next();
  } catch (error) {
    next();
  }
};
