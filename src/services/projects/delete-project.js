import { prisma } from "../../utils/prisma.js"
import { checkProjectAccess } from "../../utils/auth.js"

// Delete a project
export async function deleteProject(userId, projectId) {
    // Check access (Owner only)
    const access = await checkProjectAccess(userId, projectId, "OWNER")

    if (!access.hasAccess) {
        const error = new Error("Access denied. Only owner can delete project")
        error.name = "FORBIDDEN"
        throw error
    }

    // Delete project (cascade delete will handle related data if schema is set up correctly, 
    // otherwise we might need manual cleanup but Prisma usually handles cascades)
    await prisma.userProject.delete({
        where: { id: projectId },
    })

    return {
        message: "Project deleted successfully",
    }
}
