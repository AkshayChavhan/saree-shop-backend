import { Request, Response, NextFunction } from 'express';
export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
}
export declare function errorHandler(err: ApiError, req: Request, res: Response, next: NextFunction): void;
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export default errorHandler;
//# sourceMappingURL=error.middleware.d.ts.map