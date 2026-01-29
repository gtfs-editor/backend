import {
    verifyToken,
    extractTokenFromHeader,
    checkProjectAccess,
    getClientIP,
    sanitizeUser
} from "../utils/auth.js";
import { prisma } from "../utils/prisma.js";

/**
 * Authenticate User Middleware
 */
export async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
    });

    if (!user || !user.is_active) return null;

    return user;
}

/**
 * Express Middleware: Require Authentication
 */
export async function requireAuth(req, res, next) {
    try {
        const user = await authenticateUser(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
                error: "UNAUTHORIZED",
            });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: "INTERNAL_ERROR",
        });
    }
}

/**
 * Express Middleware: Optional Authentication
 */
export async function optionalAuth(req, res, next) {
    try {
        const user = await authenticateUser(req);
        req.user = user || null;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
}

/**
 * Express Middleware: Rate Limit
 */
export function rateLimitMiddleware(limiter) {
    return (req, res, next) => {
        const ip = getClientIP(req);
        if (!limiter.isAllowed(ip)) {
            return res.status(429).json({
                success: false,
                message: "Rate limit exceeded. Please try again later.",
                error: "RATE_LIMIT_EXCEEDED",
            });
        }
        next();
    };
}
