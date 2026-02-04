"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// GET /api/users/:clerkId/metadata - Get user metadata by Clerk ID
router.get('/:clerkId/metadata', async (req, res) => {
    try {
        const clerkId = req.params.clerkId;
        if (!clerkId) {
            return res.status(400).json({ error: 'Clerk ID is required' });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { clerkId },
            select: {
                role: true,
                email: true,
                name: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            role: user.role,
            email: user.email,
            name: user.name
        });
    }
    catch (error) {
        console.error('Error fetching user metadata:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=users.routes.js.map