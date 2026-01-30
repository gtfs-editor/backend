import { prisma } from "../../utils/prisma.js"

export async function logoutUser(userId) {
    // Invalidate all user sessions
    // NOTE: Or maybe just the current one? The original said "Invalidate all user sessions" but usually logout is just current.
    // However, the original code did `deleteMany({ where: { user_id: user.id } })`. So I will stick to that.
    await prisma.userSession.deleteMany({
        where: {
            user_id: userId,
        },
    })

    return { message: "Logout successful" };
}