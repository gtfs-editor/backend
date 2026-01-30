import { prisma } from "../../utils/prisma.js"

// Get routes
export async function getRoutes(projectId, query = {}) {
    const { page = 1, limit = 10, search = "" } = query
    const skip = (page - 1) * limit

    const whereClause = {
        project_id: projectId,
        ...(search && {
            OR: [
                { route_short_name: { contains: search, mode: "insensitive" } },
                { route_long_name: { contains: search, mode: "insensitive" } },
                { route_desc: { contains: search, mode: "insensitive" } },
                { route_id: { contains: search, mode: "insensitive" } },
            ],
        })
    }

    const [routes, total] = await Promise.all([
        prisma.route.findMany({
            where: whereClause,
            include: { agency: true },
            orderBy: [{ route_sort_order: "asc" }, { route_short_name: "asc" }],
            skip,
            take: limit
        }),
        prisma.route.count({ where: whereClause })
    ])

    return {
        routes,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    }
}

export async function getRouteById(projectId, routeId) {
    const route = await prisma.route.findFirst({
        where: {
            route_id: routeId,
            project_id: projectId
        },
        include: { agency: true }
    })

    if (!route) throw new Error("Route not found");

    return route;
}
