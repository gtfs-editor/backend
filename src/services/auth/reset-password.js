import { prisma } from "../../utils/prisma.js"
import { hashPassword, validatePassword } from "../../utils/auth.js"
import { validateRequestBody } from "../../utils/request.js"

export async function resetPassword(token, newPassword) {
    // Find valid reset token
    const resetToken = await prisma.passwordReset.findFirst({
        where: {
            token,
            used_at: null,
            expires_at: {
                gt: new Date(),
            },
        },
        include: {
            user: true,
        },
    })

    if (!resetToken) {
        const error = new Error("Invalid or expired reset token");
        error.name = "INVALID_TOKEN";
        throw error;
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
        const error = new Error("Password does not meet requirements");
        error.name = "WEAK_PASSWORD";
        error.details = passwordValidation.errors;
        throw error;
    }

    // Hash new password
    const password_hash = await hashPassword(newPassword)

    // Update user password and mark token as used
    await prisma.$transaction([
        prisma.user.update({
            where: { id: resetToken.user_id },
            data: {
                password_hash,
                updated_at: new Date(),
            },
        }),
        prisma.passwordReset.update({
            where: { id: resetToken.id },
            data: { used_at: new Date() },
        }),
        // Invalidate all user sessions
        prisma.userSession.deleteMany({
            where: { user_id: resetToken.user_id },
        }),
    ])

    return { message: "Password reset successfully" };
}
