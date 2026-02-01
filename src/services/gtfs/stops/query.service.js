import { prisma } from "../../../utils/prisma.js";

/**
 * Get all stops for a project with pagination and search
 */
export async function getStops(projectId, query = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search || "";
    const location_type = query.location_type;
    const skip = (page - 1) * limit;

    const whereClause = {
        project_id: projectId,
        ...(search && {
            OR: [
                { stop_name: { contains: search, mode: "insensitive" } },
                { stop_id: { contains: search, mode: "insensitive" } },
                { stop_desc: { contains: search, mode: "insensitive" } },
                { stop_code: { contains: search, mode: "insensitive" } },
            ],
        }),
        ...(location_type !== undefined && { location_type: parseInt(location_type) })
    };

    const [stops, total] = await Promise.all([
        prisma.stop.findMany({
            where: whereClause,
            orderBy: { stop_name: "asc" },
            skip,
            take: limit,
            include: {
                _count: {
                    select: {
                        stopTimes: true,
                        routeStops: true,
                        childStops: true
                    }
                },
                parentStop: {
                    select: {
                        stop_id: true,
                        stop_name: true
                    }
                }
            }
        }),
        prisma.stop.count({ where: whereClause })
    ]);

    return {
        stops: stops.map(stop => ({
            ...stop,
            stop_times_count: stop._count.stopTimes,
            routes_count: stop._count.routeStops,
            child_stops_count: stop._count.childStops,
            _count: undefined
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
 * Get a single stop by ID with related data
 */
export async function getStopById(projectId, stopId) {
    const stop = await prisma.stop.findFirst({
        where: {
            stop_id: stopId,
            project_id: projectId
        },
        include: {
            parentStop: true,
            childStops: {
                select: {
                    stop_id: true,
                    stop_name: true,
                    location_type: true
                }
            },
            routeStops: {
                include: {
                    route: {
                        select: {
                            route_id: true,
                            route_short_name: true,
                            route_long_name: true,
                            route_color: true
                        }
                    }
                }
            },
            _count: {
                select: {
                    stopTimes: true
                }
            }
        }
    });

    if (!stop) {
        throw new Error("Stop not found");
    }

    return {
        ...stop,
        stop_times_count: stop._count.stopTimes,
        _count: undefined
    };
}

/**
 * Get stops within a bounding box
 */
export async function getStopsInBounds(projectId, bounds) {
    const { minLat, maxLat, minLon, maxLon } = bounds;

    // Validate bounds
    if (minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) {
        throw new Error("Invalid bounds");
    }

    if (minLat >= maxLat || minLon >= maxLon) {
        throw new Error("Invalid bounds: min values must be less than max values");
    }

    const stops = await prisma.stop.findMany({
        where: {
            project_id: projectId,
            stop_lat: {
                gte: minLat,
                lte: maxLat
            },
            stop_lon: {
                gte: minLon,
                lte: maxLon
            }
        },
        select: {
            stop_id: true,
            stop_name: true,
            stop_lat: true,
            stop_lon: true,
            stop_code: true,
            location_type: true
        }
    });

    return stops;
}

/**
 * Get stops near a coordinate
 */
export async function getStopsNearby(projectId, lat, lon, radiusKm = 1) {
    // Simple bounding box approximation
    // 1 degree latitude ≈ 111 km
    // 1 degree longitude ≈ 111 km * cos(latitude)
    
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    const bounds = {
        minLat: lat - latDelta,
        maxLat: lat + latDelta,
        minLon: lon - lonDelta,
        maxLon: lon + lonDelta
    };

    return await getStopsInBounds(projectId, bounds);
}

/**
 * Get station hierarchy (station with all its child stops)
 */
export async function getStationHierarchy(projectId, stationId) {
    const station = await prisma.stop.findFirst({
        where: {
            stop_id: stationId,
            project_id: projectId,
            location_type: 1 // Must be a station
        },
        include: {
            childStops: {
                orderBy: { stop_name: 'asc' }
            }
        }
    });

    if (!station) {
        throw new Error("Station not found or stop is not a station (location_type must be 1)");
    }

    return station;
}

/**
 * Search stops by name
 */
export async function searchStops(projectId, searchTerm, limit = 10) {
    if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
    }

    const stops = await prisma.stop.findMany({
        where: {
            project_id: projectId,
            OR: [
                { stop_id: { contains: searchTerm, mode: 'insensitive' } },
                { stop_name: { contains: searchTerm, mode: 'insensitive' } },
                { stop_code: { contains: searchTerm, mode: 'insensitive' } }
            ]
        },
        select: {
            stop_id: true,
            stop_name: true,
            stop_code: true,
            stop_lat: true,
            stop_lon: true,
            location_type: true
        },
        take: limit
    });

    return stops;
}

/**
 * Get stops by zone
 */
export async function getStopsByZone(projectId, zoneId) {
    const stops = await prisma.stop.findMany({
        where: {
            project_id: projectId,
            zone_id: zoneId
        },
        orderBy: { stop_name: 'asc' }
    });

    return stops;
}

/**
 * Get stop statistics
 */
export async function getStopStats(projectId, stopId) {
    const [
        stopTimesCount,
        routesCount,
        childStopsCount,
        servingRoutes
    ] = await Promise.all([
        prisma.stopTime.count({
            where: { stop_id: stopId, project_id: projectId }
        }),
        prisma.routeStop.count({
            where: { stop_id: stopId, project_id: projectId }
        }),
        prisma.stop.count({
            where: { parent_station: stopId, project_id: projectId }
        }),
        prisma.routeStop.findMany({
            where: { stop_id: stopId, project_id: projectId },
            include: {
                route: {
                    select: {
                        route_id: true,
                        route_short_name: true,
                        route_long_name: true
                    }
                }
            },
            distinct: ['route_id']
        })
    ]);

    return {
        stop_id: stopId,
        total_stop_times: stopTimesCount,
        total_routes: routesCount,
        total_child_stops: childStopsCount,
        serving_routes: servingRoutes.map(rs => rs.route)
    };
}
