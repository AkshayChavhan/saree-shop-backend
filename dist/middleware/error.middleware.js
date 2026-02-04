"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    const code = err.code || 'SERVER_ERROR';
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            code,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
}
class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code = 'SERVER_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
exports.default = errorHandler;
//# sourceMappingURL=error.middleware.js.map