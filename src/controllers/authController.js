import { prisma } from "../utils/prisma.js";
import {
    hashPassword,
    verifyUserCredentials,
    generateToken,
    sanitizeUser,
    validateEmail,
    validatePassword,
    getClientIP
} from "../utils/auth.js";

export async function register(req, res) {
    try {
        const { email, username, password, first_name, last_name } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                error: "VALIDATION_ERROR",
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format",
                error: "INVALID_EMAIL",
            });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Password does not meet requirements",
                errors: passwordValidation.errors,
                error: "WEAK_PASSWORD",
            });
        }

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
            return res.status(409).json({
                success: false,
                message: `User with this ${field} already exists`,
                error: "USER_EXISTS",
            });
        }

        const password_hash = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                username: username.toLowerCase(),
                password_hash,
                first_name: first_name || null,
                last_name: last_name || null,
                preferences: {
                    create: {},
                },
            },
            include: {
                preferences: true,
            },
        });

        const token = generateToken(user);

        const session = await prisma.userSession.create({
            data: {
                user_id: user.id,
                session_token: token,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                ip_address: getClientIP(req),
                user_agent: req.headers["user-agent"] || null,
            },
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: sanitizeUser(user),
                token,
                expires_at: session.expires_at,
            },
        });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: "INTERNAL_ERROR",
        });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
                error: "VALIDATION_ERROR",
            });
        }

        const user = await verifyUserCredentials(email, password);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
                error: "INVALID_CREDENTIALS",
            });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { last_login: new Date() },
        });

        const token = generateToken(user);

        const session = await prisma.userSession.create({
            data: {
                user_id: user.id,
                session_token: token,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                ip_address: getClientIP(req),
                user_agent: req.headers["user-agent"] || null,
            },
        });

        res.json({
            success: true,
            message: "Login successful",
            data: {
                user: sanitizeUser(user),
                token,
                expires_at: session.expires_at,
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: "INTERNAL_ERROR",
        });
    }
}

export async function getMe(req, res) {
    try {
        const fullUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                preferences: true,
                ownedProjects: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                        updated_at: true,
                    },
                },
                sharedProjects: {
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                created_at: true,
                                updated_at: true,
                            },
                        },
                    },
                },
            },
        });

        res.json({
            success: true,
            data: {
                user: sanitizeUser(fullUser),
            },
        });
    } catch (error) {
        console.error("Get Me Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: "INTERNAL_ERROR",
        });
    }
}
