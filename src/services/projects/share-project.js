import { prisma } from "../../utils/prisma.js"
import { checkProjectAccess } from "../../utils/auth.js"

// Share a project
export async function shareProject(userId, projectId, email, role) {
    // Validate role
    if (!["EDITOR", "VIEWER"].includes(role)) {
        const error = new Error("Invalid role. Must be EDITOR or VIEWER")
        error.name = "BAD_REQUEST"
        throw error
    }

    // Check access (Owner only can share)
    const access = await checkProjectAccess(userId, projectId, "OWNER")
    if (!access.hasAccess) {
        const error = new Error("Access denied. Only owner can share project")
        error.name = "FORBIDDEN"
        throw error
    }

    // Find user to share with
    const userToShare = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    })

    if (!userToShare) {
        const error = new Error("User with this email not found")
        error.name = "USER_NOT_FOUND"
        throw error
    }

    if (userToShare.id === userId) {
        const error = new Error("You cannot share a project with yourself")
        error.name = "BAD_REQUEST"
        throw error
    }

    // Check if already shared
    const existingShare = await prisma.projectShare.findFirst({
        where: { project_id: projectId, user_id: userToShare.id }
    })

    if (existingShare) {
        const updatedShare = await prisma.projectShare.update({
            where: { id: existingShare.id },
            data: { role }
        })
        return { message: "Project access updated", share: updatedShare }
    }

    // Create new share
    const newShare = await prisma.projectShare.create({
        data: {
            project_id: projectId,
            user_id: userToShare.id,
            role,
            shared_by: userId
        }
    })

    return { message: "Project shared successfully", share: newShare }
}

// Unshare a project
export async function unshareProject(userId, projectId, targetUserId) {
    // Check access (Owner only)
    const access = await checkProjectAccess(userId, projectId, "OWNER")

    // Allow self-removal (if user wants to leave a project)
    const isSelfRemoval = userId === targetUserId;

    if (!access.hasAccess && !isSelfRemoval) {
        // If not owner, and not removing self, deny.
        const error = new Error("Access denied")
        error.name = "FORBIDDEN"
        throw error
    }

    // Find share record
    const share = await prisma.projectShare.findFirst({
        where: { project_id: projectId, user_id: targetUserId }
    })

    if (!share) {
        const error = new Error("User does not have access to this project")
        error.name = "NOT_FOUND"
        throw error
    }

    // Delete share
    await prisma.projectShare.delete({
        where: { id: share.id }
    })

    return { message: "Access removed successfully" }
}
