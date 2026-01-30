import { prisma } from "../../utils/prisma.js"
import { generatePasswordResetToken } from "../../utils/auth.js"
import { validateRequestBody } from "../../utils/request.js"

export async function forgotPassword(email) {
    // Validate email format
    if (!validateEmail(email)) {
        const error = new Error("Invalid email format");
        error.name = "INVALID_EMAIL";
        throw error;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    // But only create reset token if user exists
    if (user && user.is_active) {
        // Invalidate any existing password reset tokens
        await prisma.passwordReset.updateMany({
            where: {
                user_id: user.id,
                used_at: null,
            },
            data: {
                used_at: new Date(),
            },
        })

        // Generate new reset token
        const { token, expires_at } = generatePasswordResetToken()

        await prisma.passwordReset.create({
            data: {
                user_id: user.id,
                token,
                expires_at,
            },
        })

        // TODO: Send email with reset token
        // You'll need to implement email service (e.g., SendGrid, Nodemailer)
        console.log(`Password reset token for ${email}: ${token}`)
    }

    return { message: "If an account with that email exists, a password reset link has been sent." };
}
