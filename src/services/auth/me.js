import { prisma } from "../../utils/prisma.js"
import { sanitizeUser } from "../../utils/auth.js"

export async function getUserProfile(userId) {
    // Get full user data with preferences and projects
    const fullUser = await prisma.user.findUnique({
        where: { id: userId },
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
    })

    if (!fullUser) {
        const error = new Error("User not found");
        error.name = "USER_NOT_FOUND";
        throw error;
    }

    return { user: sanitizeUser(fullUser) };
}