import { prisma } from "../../utils/prisma.js"
import { validateRequestBody } from "../../utils/request.js"

// Create a new project
export async function createProject(userId, projectData) {
    // Validate request body
    const { name, description } = validateRequestBody(projectData, {
        required: ["name"],
        fields: {
            name: "string",
            description: "string", // optional but must be string if present
        }
    })

    // Create project
    const newProject = await prisma.userProject.create({
        data: {
            name,
            description: description || "",
            owner_id: userId,
            is_active: true,
        },
    })

    return {
        message: "Project created successfully",
        project: newProject,
    }
}
