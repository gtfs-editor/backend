import { prisma } from "../../utils/prisma.js"
import {
    verifyUserCredentials,
    generateToken,
    sanitizeUser,
} from "../../utils/auth.js"

export async function loginUser({ email, password, ip, userAgent }) {
    // Verify credentials
    const user = await verifyUserCredentials(email, password)

    if (!user) {
        const error = new Error("Invalid credentials")
        error.name = "INVALID_CREDENTIALS"
        error.status = 401
        throw error
    }

    // Update last login
    await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() },
    })

    // Generate token
    const token = generateToken(user)

    // Create session
    const session = await prisma.userSession.create({
        data: {
            user_id: user.id,
            session_token: token,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            ip_address: ip,
            user_agent: userAgent,
        },
    })

    return {
        user: sanitizeUser(user),
        token,
        expires_at: session.expires_at,
    }
}
