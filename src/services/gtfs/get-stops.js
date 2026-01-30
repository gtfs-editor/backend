import { prisma } from "../../utils/prisma.js"

// Get all stops for a project
export async function getStops(projectId, query = {}) {
    const { page = 1, limit = 10, search = "" } = query
    const skip = (page - 1) * limit

    const whereClause = {
        project_id: projectId, // Enforce project scope
        ...(search && {
            OR: [
                { stop_name: { contains: search, mode: "insensitive" } },
                { stop_id: { contains: search, mode: "insensitive" } },
                { stop_desc: { contains: search, mode: "insensitive" } },
            ],
        })
    }

    const [stops, total] = await Promise.all([
        prisma.stop.findMany({
            where: whereClause,
            orderBy: { stop_id: "asc" },
            skip,
            take: limit,
        }),
        prisma.stop.count({ where: whereClause })
    ])

    return {
        stops,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    }
}
