"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const prisma_1 = __importDefault(require("../lib/prisma"));
async function requireAuth(req, res, next) {
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
        const session = await (0, clerk_sdk_node_1.verifyToken)(token, {
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
        const user = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            error: { message: 'Unauthorized', code: 'AUTH_ERROR' }
        });
    }
}
// Optional auth - doesn't fail if no token, but attaches user if present
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.replace('Bearer ', '');
        const session = await (0, clerk_sdk_node_1.verifyToken)(token, {
            secretKey: process.env.CLERK_SECRET_KEY || '',
        });
        if (session && session.sub) {
            const user = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        // Silent fail for optional auth
        next();
    }
}
exports.default = requireAuth;
//# sourceMappingURL=auth.middleware.js.map