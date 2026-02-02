"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
exports.requireSuperAdmin = requireSuperAdmin;
async function requireAdmin(req, res, next) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { message: 'Unauthorized', code: 'NO_USER' }
            });
            return;
        }
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            res.status(403).json({
                success: false,
                error: { message: 'Forbidden - Admin access required', code: 'NOT_ADMIN' }
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error', code: 'SERVER_ERROR' }
        });
    }
}
async function requireSuperAdmin(req, res, next) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { message: 'Unauthorized', code: 'NO_USER' }
            });
            return;
        }
        if (req.user.role !== 'SUPER_ADMIN') {
            res.status(403).json({
                success: false,
                error: { message: 'Forbidden - Super Admin access required', code: 'NOT_SUPER_ADMIN' }
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Super Admin middleware error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal server error', code: 'SERVER_ERROR' }
        });
    }
}
exports.default = requireAdmin;
//# sourceMappingURL=admin.middleware.js.map