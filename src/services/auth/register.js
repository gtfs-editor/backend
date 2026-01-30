import { prisma } from "../../utils/prisma.js"
import {
    hashPassword,
    generateToken,
    sanitizeUser,
    validateEmail,
    validatePassword,
} from "../../utils/auth.js"
import { validateRequestBody } from "../../utils/request.js"

export async function registerUser({ email, username, password, firstName, lastName, ip, userAgent }) {
    // Validate email format
    if (!validateEmail(email)) {
        const error = new Error("Invalid email format");
        error.name = "INVALID_EMAIL";
        throw error;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        const error = new Error("Password does not meet requirements");
        error.name = "WEAK_PASSWORD";
        error.details = passwordValidation.errors;
        throw error;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: email.toLowerCase() },
                { username: username.toLowerCase() },
            ],
        },
    });

    if (existingUser) {
        const field = existingUser.email === email.toLowerCase() ? "email" : "username";
        const error = new Error(`User with this ${field} already exists`);
        error.name = "USER_EXISTS";
        throw error;
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            password_hash,
            first_name: firstName || null,
            last_name: lastName || null,
            preferences: {
                create: {}, // Create default preferences
            },
        },
        include: {
            preferences: true,
        },
    });

    // Generate token
    const token = generateToken(user);

    // Create session
    const session = await prisma.userSession.create({
        data: {
            user_id: user.id,
            session_token: token,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            ip_address: ip,
            user_agent: userAgent,
        },
    });

    return {
        user: sanitizeUser(user),
        token,
        expires_at: session.expires_at,
    };
}