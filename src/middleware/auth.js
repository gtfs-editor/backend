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

/**
 * Express Middleware: Require Project Access
 * This middleware assumes that authenticateUser (requireAuth) has already run and req.user is set.
 */
export function requireProjectAccess(minimumRole = "VIEWER") {
    return async (req, res, next) => {
        try {
            // Get project ID from params or query or body
            const projectId = req.params.projectId || req.params.id || req.body.projectId || req.query.projectId;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    message: "Project ID is required",
                    error: "BAD_REQUEST"
                });
            }

            if (!req.user) {
                // Should encounter this case only if requireAuth wasn't used prior
                const user = await authenticateUser(req);
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "Authentication required",
                        error: "UNAUTHORIZED"
                    });
                }
                req.user = user;
            }

            const accessResult = await checkProjectAccess(req.user.id, projectId, minimumRole);

            if (!accessResult.hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Insufficient project permissions.",
                    error: "FORBIDDEN"
                });
            }

            // Attach project and role to request for controllers to use
            req.project = accessResult.project;
            req.projectRole = accessResult.role;
            next();
        } catch (error) {
            console.error("Project Access Middleware Error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error during authorization",
                error: "INTERNAL_ERROR"
            });
        }
    };
}
