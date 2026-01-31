import { UserRole } from '@prisma/client';

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
        role: UserRole;
      };
    }
  }
}

export {};
