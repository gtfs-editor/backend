import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import 'dotenv/config';
import { prisma } from "./prisma.js";

// Environment variables validation
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

if (!JWT_SECRET) {
    // Warn but don't crash if checking unrelated things, but strictly it's needed
    console.warn("JWT_SECRET environment variable is required");
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
    try {
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        return hash;
    } catch (error) {
        throw new Error("Error hashing password");
    }
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        return false;
    }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
    if (!user.id) {
        throw new Error("User ID is required for token generation");
    }

    const payload = {
        userId: user.id,
        iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded.userId) {
            return null;
        }

        return {
            userId: decoded.userId,
            iat: decoded.iat,
            exp: decoded.exp,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.slice(7);
}

/**
 * Verify user credentials for login
 */
export async function verifyUserCredentials(emailOrUsername, password) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: emailOrUsername.toLowerCase() },
                    { username: emailOrUsername.toLowerCase() },
                ],
                is_active: true,
            },
            include: {
                preferences: true,
            },
        });

        if (!user) {
            return null;
        }

        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return null;
        }

        return user;
    } catch (error) {
        console.error("Credential verification error:", error);
        return null;
    }
}

/**
 * Check if user has access to a specific project
 */
export async function checkProjectAccess(userId, projectId, minimumRole = "VIEWER") {
    try {
        if (!userId || !projectId) {
            return { hasAccess: false, role: null, project: null };
        }

        // Check if user owns the project
        const ownedProject = await prisma.userProject.findFirst({
            where: {
                id: projectId,
                owner_id: userId,
            },
        });

        if (ownedProject) {
            return {
                hasAccess: true,
                role: "OWNER",
                project: ownedProject,
            };
        }

        // Check if user has shared access
        const sharedAccess = await prisma.projectShare.findFirst({
            where: {
                project_id: projectId,
                user_id: userId,
            },
            include: {
                project: true,
            },
        });

        if (sharedAccess) {
            const roleHierarchy = { VIEWER: 1, EDITOR: 2, OWNER: 3 };
            const userRoleLevel = roleHierarchy[sharedAccess.role] || 0;
            const requiredRoleLevel = roleHierarchy[minimumRole] || 1;

            if (userRoleLevel >= requiredRoleLevel) {
                return {
                    hasAccess: true,
                    role: sharedAccess.role,
                    project: sharedAccess.project,
                };
            }
        }

        return { hasAccess: false, role: null, project: null };
    } catch (error) {
        console.error("Project access check error:", error);
        return { hasAccess: false, role: null, project: null, error: error.message };
    }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
}

export const generatePasswordResetToken = () => generateSecureToken(32);

/**
 * Validate password strength
 */
export function validatePassword(password) {
    const errors = [];

    if (!password) {
        errors.push("Password is required");
        return { isValid: false, errors };
    }

    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    }

    if (!/(?=.*[A-Z])/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    }

    if (!/(?=.*\d)/.test(password)) {
        errors.push("Password must contain at least one number");
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
        errors.push("Password must contain at least one special character (@$!%*?&)");
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Validate email format
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize user data
 */
export function sanitizeUser(user) {
    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser;
}

/**
 * Rate Limiter Class
 */
class RateLimiter {
    constructor(windowMs = 15 * 60 * 1000, maxAttempts = 5) {
        this.windowMs = windowMs;
        this.maxAttempts = maxAttempts;
        this.attempts = new Map();
    }

    isAllowed(identifier) {
        const now = Date.now();
        const userAttempts = this.attempts.get(identifier) || [];

        // Clean old attempts outside window
        const validAttempts = userAttempts.filter(
            (time) => now - time < this.windowMs
        );

        if (validAttempts.length >= this.maxAttempts) {
            return false;
        }

        validAttempts.push(now);
        this.attempts.set(identifier, validAttempts);
        return true;
    }

    reset(identifier) {
        this.attempts.delete(identifier);
    }
}

export const loginRateLimiter = new RateLimiter(60 * 1000, 500);
export const registerRateLimiter = new RateLimiter(60 * 60 * 1000, 3);
export const passwordResetRateLimiter = new RateLimiter(60 * 60 * 1000, 3);

/**
 * Get client IP address
 */
export function getClientIP(req) {
    const forwarded = req.headers["x-forwarded-for"];
    const real = req.headers["x-real-ip"];
    if (forwarded) return forwarded.split(",")[0].trim();
    if (real) return real.trim();
    return req.socket.remoteAddress || "unknown";
}
