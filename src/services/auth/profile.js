import { prisma } from "../../utils/prisma.js"
import { validateEmail, sanitizeUser } from "../../utils/auth.js"
import { validateRequestBody } from "../../utils/request.js"

export async function updateUserProfile(userId, data) {
    const { email, username, first_name, last_name, avatar_url } = data
    const updateData = {}

    // Get current user to check for changes
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // Validate email if provided
    if (email && email !== user.email) {
        if (!validateEmail(email)) {
            const error = new Error("Invalid email format");
            error.name = "INVALID_EMAIL";
            throw error;
        }

        // Check if email is already taken
        const existingUser = await prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                NOT: { id: userId },
            },
        })

        if (existingUser) {
            const error = new Error("Email is already taken");
            error.name = "EMAIL_TAKEN";
            throw error;
        }

        updateData.email = email.toLowerCase()
    }

    // Validate username if provided
    if (username && username !== user.username) {
        const existingUser = await prisma.user.findFirst({
            where: {
                username: username.toLowerCase(),
                NOT: { id: userId },
            },
        })

        if (existingUser) {
            const error = new Error("Username is already taken");
            error.name = "USERNAME_TAKEN";
            throw error;
        }

        updateData.username = username.toLowerCase()
    }

    // Add other fields
    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url

    // Update user
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            ...updateData,
            updated_at: new Date(),
        },
        include: {
            preferences: true,
        },
    })

    return { user: sanitizeUser(updatedUser) };
}