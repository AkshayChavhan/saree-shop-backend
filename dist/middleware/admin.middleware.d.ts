import { Request, Response, NextFunction } from 'express';
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void>;
export default requireAdmin;
//# sourceMappingURL=admin.middleware.d.ts.map