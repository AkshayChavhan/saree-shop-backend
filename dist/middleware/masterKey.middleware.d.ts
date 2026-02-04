import { Request, Response, NextFunction } from 'express';
/**
 * Master API Key Authentication Middleware
 *
 * Validates that all incoming requests include a valid master API key.
 * This provides an additional security layer before user authentication.
 *
 * Configuration:
 * - MASTER_API_KEY: The secret master key (required in production)
 * - BYPASS_MASTER_KEY: Set to 'true' to disable master key check (development only)
 *
 * Usage:
 * Apply this middleware globally in index.ts before any routes
 */
/**
 * Master API key validation middleware
 *
 * Checks for master API key in request headers:
 * - Header name: X-API-Key or x-api-key (case-insensitive)
 * - Value must match MASTER_API_KEY environment variable
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export declare function requireMasterKey(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Optional master key validation
 *
 * Validates master key if provided, but doesn't fail if missing.
 * Useful for endpoints that support both public and authenticated access.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export declare function optionalMasterKey(req: Request, res: Response, next: NextFunction): Promise<void>;
export default requireMasterKey;
//# sourceMappingURL=masterKey.middleware.d.ts.map