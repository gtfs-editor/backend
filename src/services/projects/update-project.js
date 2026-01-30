import { prisma } from "../../utils/prisma.js"
import { checkProjectAccess } from "../../utils/auth.js"

// Update a project
export async function updateProject(userId, projectId, updates) {
    // Check access (Owner or Editor required)
    const access = await checkProjectAccess(userId, projectId, "EDITOR")

    if (!access.hasAccess) {
        const error = new Error("Access denied")
        error.name = "FORBIDDEN"
        throw error
    }

    // Validate request body
    const { name, description } = updates

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    // Update project
    const updatedProject = await prisma.userProject.update({
        where: { id: projectId },
        data: {
            ...updateData,
            updated_at: new Date(),
        },
    })

    return {
        message: "Project updated successfully",
        project: updatedProject,
    }
}
