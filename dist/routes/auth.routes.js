"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/auth/check-role - Check user role
router.get('/check-role', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.json({
                isAuthenticated: false,
                role: null,
                isAdmin: false,
                isSuperAdmin: false
            });
        }
        res.json({
            isAuthenticated: true,
            role: req.user.role,
            isAdmin: req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN',
            isSuperAdmin: req.user.role === 'SUPER_ADMIN',
            user: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name
            }
        });
    }
    catch (error) {
        console.error('Error checking role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map