import { Request, Response, NextFunction } from 'express';
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
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
export default requireAuth;
//# sourceMappingURL=auth.middleware.d.ts.map