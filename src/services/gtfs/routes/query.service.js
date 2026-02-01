import { prisma } from "../../../utils/prisma.js";

/**
 * Get all routes for a project with pagination and search
 */
export async function getRoutes(projectId, query = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search || "";
    const skip = (page - 1) * limit;

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
    };

    const [routes, total] = await Promise.all([
        prisma.route.findMany({
            where: whereClause,
            include: { 
                agency: true,
                _count: {
                    select: {
                        routeStops: true,
                        trips: true
                    }
                }
            },
            orderBy: [
                { route_sort_order: "asc" }, 
                { route_short_name: "asc" }
            ],
            skip,
            take: limit
        }),
        prisma.route.count({ where: whereClause })
    ]);

    return {
        routes: routes.map(route => ({
            ...route,
            stops_count: route._count.routeStops,
            trips_count: route._count.trips
        })),
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get a single route by ID with basic info
 */
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
            },
            _count: {
                select: {
                    trips: true
                }
            }
        }
    });

    if (!route) {
        throw new Error("Route not found");
    }

    // Process route_stops into directions object
    const directions = {};

    if (route.routeStops && route.routeStops.length > 0) {
        route.routeStops.forEach(rs => {
            const dirId = rs.direction_id ?? 0;
            if (!directions[dirId]) {
                directions[dirId] = [];
            }

            directions[dirId].push({
                ...rs.stop,
                stop_sequence: rs.stop_sequence,
                direction_id: dirId,
                stop_lat: rs.stop.stop_lat ? Number(rs.stop.stop_lat) : null,
                stop_lon: rs.stop.stop_lon ? Number(rs.stop.stop_lon) : null
            });
        });
    }

    // Remove routeStops from response and add processed directions
    const { routeStops, _count, ...routeData } = route;

    return {
        ...routeData,
        directions,
        available_directions: Object.keys(directions).map(id => parseInt(id, 10)),
        stops_count: routeStops.length,
        trips_count: _count.trips
    };
}

/**
 * Get detailed route information including all stops organized by direction
 * This is used for the route details page
 */
export async function getRouteDetails(projectId, routeId) {
    // Get basic route info
    const route = await prisma.route.findFirst({
        where: {
            route_id: routeId,
            project_id: projectId
        },
        include: { 
            agency: true,
            _count: {
                select: {
                    trips: true,
                    routeStops: true
                }
            }
        }
    });

    if (!route) {
        throw new Error(`Route with ID ${routeId} not found`);
    }

    // Get route stops organized by direction
    const routeStops = await prisma.routeStop.findMany({
        where: {
            route_id: routeId,
            project_id: projectId
        },
        include: {
            stop: true
        },
        orderBy: [
            { direction_id: 'asc' },
            { stop_sequence: 'asc' }
        ]
    });

    // Group stops by direction
    const directions = {};
    const availableDirections = new Set();

    routeStops.forEach(rs => {
        const dirId = rs.direction_id;
        availableDirections.add(dirId);

        if (!directions[dirId]) {
            directions[dirId] = [];
        }

        directions[dirId].push({
            stop_id: rs.stop.stop_id,
            stop_name: rs.stop.stop_name,
            stop_desc: rs.stop.stop_desc,
            stop_code: rs.stop.stop_code,
            stop_lat: Number(rs.stop.stop_lat),
            stop_lon: Number(rs.stop.stop_lon),
            stop_sequence: rs.stop_sequence,
            direction_id: dirId,
            zone_id: rs.stop.zone_id,
            location_type: rs.stop.location_type,
            wheelchair_boarding: rs.stop.wheelchair_boarding
        });
    });

    // Get sample trip for each direction to get headsigns
    const directionHeadsigns = {};
    for (const dir of Array.from(availableDirections)) {
        const sampleTrip = await prisma.trip.findFirst({
            where: {
                route_id: routeId,
                direction_id: dir,
                project_id: projectId
            },
            select: {
                trip_headsign: true,
                direction_id: true
            }
        });

        if (sampleTrip) {
            directionHeadsigns[dir] = sampleTrip.trip_headsign;
        }
    }

    const { _count, ...routeData } = route;

    return {
        ...routeData,
        directions,
        direction_headsigns: directionHeadsigns,
        available_directions: Array.from(availableDirections).sort(),
        stops_count: _count.routeStops,
        trips_count: _count.trips
    };
}

/**
 * Get route statistics
 */
export async function getRouteStats(projectId, routeId) {
    const [
        stopsCount,
        tripsCount,
        directionsCount
    ] = await Promise.all([
        prisma.routeStop.count({
            where: { route_id: routeId, project_id: projectId }
        }),
        prisma.trip.count({
            where: { route_id: routeId, project_id: projectId }
        }),
        prisma.trip.findMany({
            where: { route_id: routeId, project_id: projectId },
            distinct: ['direction_id'],
            select: { direction_id: true }
        })
    ]);

    return {
        route_id: routeId,
        total_stops: stopsCount,
        total_trips: tripsCount,
        total_directions: directionsCount.length,
        available_directions: directionsCount.map(d => d.direction_id).sort()
    };
}

/**
 * Search routes by name or ID
 */
export async function searchRoutes(projectId, searchTerm, limit = 10) {
    if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
    }

    const routes = await prisma.route.findMany({
        where: {
            project_id: projectId,
            OR: [
                { route_id: { contains: searchTerm, mode: 'insensitive' } },
                { route_short_name: { contains: searchTerm, mode: 'insensitive' } },
                { route_long_name: { contains: searchTerm, mode: 'insensitive' } }
            ]
        },
        select: {
            route_id: true,
            route_short_name: true,
            route_long_name: true,
            route_color: true,
            route_type: true
        },
        take: limit
    });

    return routes;
}
