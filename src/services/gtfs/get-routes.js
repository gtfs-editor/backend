import { prisma } from "../../utils/prisma.js"

// Get routes
export async function getRoutes(projectId, query = {}) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const search = query.search || ""
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
        include: {
            agency: true,
            routeStops: {
                include: {
                    stop: true
                },
                orderBy: [
                    { direction_id: 'asc' },
                    { stop_sequence: 'asc' }
                ]
            }
        }
    })

    if (!route) throw new Error("Route not found");

    // Process route_stops into directions object
    const directions = {};

    if (route.routeStops && route.routeStops.length > 0) {
        route.routeStops.forEach(rs => {
            const dirId = rs.direction_id ?? 0;
            if (!directions[dirId]) {
                directions[dirId] = [];
            }

            // Format stop with sequence for frontend
            directions[dirId].push({
                ...rs.stop,
                stop_sequence: rs.stop_sequence,
                direction_id: dirId,
                // Ensure lat/lon are numbers if they exist
                stop_lat: rs.stop.stop_lat ? Number(rs.stop.stop_lat) : null,
                stop_lon: rs.stop.stop_lon ? Number(rs.stop.stop_lon) : null
            });
        });
    }

    // Return route with added directions property
    return {
        ...route,
        directions,
        available_directions: Object.keys(directions).map(id => parseInt(id, 10)),
        // Optional: Include summary info
        total_stops: route.routeStops?.length || 0
    };
}
