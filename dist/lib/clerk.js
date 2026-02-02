"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clerkClient = void 0;
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
if (!process.env.CLERK_SECRET_KEY) {
    console.warn('Warning: CLERK_SECRET_KEY is not set');
}
exports.clerkClient = (0, clerk_sdk_node_1.createClerkClient)({
    secretKey: process.env.CLERK_SECRET_KEY || '',
});
exports.default = exports.clerkClient;
//# sourceMappingURL=clerk.js.map