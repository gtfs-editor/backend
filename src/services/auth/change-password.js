
import { prisma } from "../../utils/prisma.js"
import { verifyPassword, hashPassword, validatePassword } from "../../utils/auth.js"

export async function changePassword(userId, currentPassword, newPassword, currentToken) {
    // Get user's current password hash
    const fullUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { password_hash: true },
    })

    if (!fullUser) {
        const error = new Error("User not found");
        error.name = "USER_NOT_FOUND";
        throw error;
    }

    // Verify current password
    const isValidCurrentPassword = await verifyPassword(
        currentPassword,
        fullUser.password_hash
    )
    if (!isValidCurrentPassword) {
        const error = new Error("Current password is incorrect");
        error.name = "INVALID_CURRENT_PASSWORD";
        throw error;
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
        const error = new Error("New password does not meet requirements");
        error.name = "WEAK_PASSWORD";
        error.details = passwordValidation.errors;
        throw error;
    }

    // Hash new password
    const new_password_hash = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
        where: { id: userId },
        data: {
            password_hash: new_password_hash,
            updated_at: new Date(),
        },
    })

    // Invalidate all existing sessions except current one
    await prisma.userSession.deleteMany({
        where: {
            user_id: userId,
            session_token: {
                not: currentToken,
            },
        },
    })

    return { message: "Password changed successfully" };
}