import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

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
export async function requireMasterKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if master key bypass is enabled (development only)
    const bypassEnabled = process.env.BYPASS_MASTER_KEY === 'true';

    if (bypassEnabled && process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Master API key check bypassed (development mode)');
      next();
      return;
    }

    // Get master API key from environment
    const masterApiKey = process.env.MASTER_API_KEY;

    if (!masterApiKey) {
      console.error('❌ MASTER_API_KEY environment variable is not configured');
      res.status(500).json({
        success: false,
        error: {
          message: 'Server configuration error',
          code: 'MASTER_KEY_NOT_CONFIGURED'
        }
      });
      return;
    }

    // Extract API key from request headers (case-insensitive)
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

    // Check if API key is provided
    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Master API key is required. Include X-API-Key header with your request.',
          code: 'MASTER_KEY_MISSING'
        }
      });
      return;
    }

    // Validate API key
    if (apiKey !== masterApiKey) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid master API key. Access denied.',
          code: 'MASTER_KEY_INVALID'
        }
      });
      return;
    }

    // Master key is valid, proceed to next middleware
    next();
  } catch (error) {
    console.error('Master key middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Master API key validation failed',
        code: 'MASTER_KEY_ERROR'
      }
    });
  }
}

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
export async function optionalMasterKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const masterApiKey = process.env.MASTER_API_KEY;
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

    // If no API key provided, continue without validation
    if (!apiKey) {
      next();
      return;
    }

    // If API key provided but doesn't match, reject
    if (masterApiKey && apiKey !== masterApiKey) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid master API key',
          code: 'MASTER_KEY_INVALID'
        }
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Optional master key middleware error:', error);
    next();
  }
}

export default requireMasterKey;
