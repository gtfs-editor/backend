import { prisma } from "../../utils/prisma.js"
import { checkProjectAccess } from "../../utils/auth.js"

// Get projects for a user
export async function getProjects(userId, query = {}) {
    const { page = 1, limit = 10, search = "" } = query
    const skip = (page - 1) * limit

    // Create search filter
    const searchFilter = search
        ? {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ],
        }
        : {}

    // Get owned projects
    const [ownedProjects, ownedCount] = await Promise.all([
        prisma.userProject.findMany({
            where: {
                owner_id: userId,
                ...searchFilter,
            },
            orderBy: { updated_at: "desc" },
            skip,
            take: limit,
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                shares: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.userProject.count({
            where: {
                owner_id: userId,
                ...searchFilter,
            },
        }),
    ])

    // Get shared projects
    const [sharedProjects, sharedCount] = await Promise.all([
        prisma.projectShare.findMany({
            where: {
                user_id: userId,
                project: searchFilter,
            },
            orderBy: { created_at: "desc" },
            skip,
            take: limit,
            include: {
                project: {
                    include: {
                        owner: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.projectShare.count({
            where: {
                user_id: userId,
                project: searchFilter,
            },
        }),
    ])

    // Format response
    const projects = [
        ...ownedProjects.map((p) => ({ ...p, role: "OWNER" })),
        ...sharedProjects.map((s) => ({ ...s.project, role: s.role })),
    ]

    return {
        projects,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total: ownedCount + sharedCount,
            pages: Math.ceil((ownedCount + sharedCount) / limit),
        },
    }
}

// Get single project details
export async function getProjectById(userId, projectId) {
    const access = await checkProjectAccess(userId, projectId, "VIEWER")

    if (!access.hasAccess) {
        const error = new Error("Access denied or project not found")
        error.name = "NOT_FOUND"
        throw error
    }

    return {
        project: access.project,
        role: access.role
    }
}
