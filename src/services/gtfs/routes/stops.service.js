import { prisma } from "../../../utils/prisma.js";
import { validateStopSequence } from "./validation.js";

/**
 * Assign stops to a route for a specific direction
 * This replaces all stops for the given direction
 */
export async function assignStopsToRoute(projectId, routeId, stops, directionId = 0) {
    // Validate inputs
    if (!stops || !Array.isArray(stops)) {
        throw new Error("Stops must be provided as an array");
    }

    // Validate direction
    if (![0, 1].includes(parseInt(directionId))) {
        throw new Error("Direction ID must be 0 (outbound) or 1 (inbound)");
    }

    const direction = parseInt(directionId);

    // Validate stop sequence
    validateStopSequence(stops);

    // Verify route exists
    const route = await prisma.route.findFirst({
        where: { route_id: routeId, project_id: projectId }
    });

    if (!route) {
        throw new Error("Route not found in this project");
    }

    // Verify all stops exist in the project
    const stopIds = stops.map(s => s.stop_id);
    const existingStops = await prisma.stop.findMany({
        where: {
            stop_id: { in: stopIds },
            project_id: projectId
        },
        select: { stop_id: true }
    });

    const existingStopIds = new Set(existingStops.map(s => s.stop_id));
    const missingStops = stopIds.filter(id => !existingStopIds.has(id));

    if (missingStops.length > 0) {
        throw new Error(`Stops not found in project: ${missingStops.join(', ')}`);
    }

    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
        // 1. Delete existing stops for this route and direction
        await tx.routeStop.deleteMany({
            where: {
                route_id: routeId,
                project_id: projectId,
                direction_id: direction
            }
        });

        // 2. Insert new stops
        if (stops.length === 0) {
            return [];
        }

        const createData = stops.map((stop, index) => ({
            route_id: routeId,
            stop_id: stop.stop_id,
            stop_sequence: stop.stop_sequence || (index + 1),
            project_id: projectId,
            direction_id: direction
        }));

        await tx.routeStop.createMany({
            data: createData
        });

        // 3. Return all stops for this route (both directions)
        const allRouteStops = await tx.routeStop.findMany({
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

        return allRouteStops;
    });
}

/**
 * Get all stops for a route, organized by direction
 */
export async function getRouteStops(projectId, routeId) {
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

    // Group by direction
    const directions = {};
    
    routeStops.forEach(rs => {
        const dirId = rs.direction_id;
        if (!directions[dirId]) {
            directions[dirId] = [];
        }
        
        directions[dirId].push({
            ...rs.stop,
            stop_sequence: rs.stop_sequence,
            direction_id: dirId
        });
    });

    return {
        route_id: routeId,
        directions,
        available_directions: Object.keys(directions).map(d => parseInt(d)),
        stops: routeStops
    };
}

/**
 * Get stops for a specific direction of a route
 */
export async function getRouteStopsByDirection(projectId, routeId, directionId) {
    const direction = parseInt(directionId);
    
    if (![0, 1].includes(direction)) {
        throw new Error("Direction ID must be 0 (outbound) or 1 (inbound)");
    }

    const routeStops = await prisma.routeStop.findMany({
        where: {
            route_id: routeId,
            project_id: projectId,
            direction_id: direction
        },
        include: { 
            stop: true 
        },
        orderBy: { stop_sequence: 'asc' }
    });

    return routeStops.map(rs => ({
        ...rs.stop,
        stop_sequence: rs.stop_sequence,
        direction_id: rs.direction_id
    }));
}

/**
 * Clear all stops for a route direction
 */
export async function clearRouteStops(projectId, routeId, directionId = null) {
    const where = {
        route_id: routeId,
        project_id: projectId
    };

    if (directionId !== null) {
        const direction = parseInt(directionId);
        if (![0, 1].includes(direction)) {
            throw new Error("Direction ID must be 0 (outbound) or 1 (inbound)");
        }
        where.direction_id = direction;
    }

    await prisma.routeStop.deleteMany({ where });

    return { 
        message: directionId !== null 
            ? `Stops cleared for direction ${directionId}`
            : "All stops cleared for route"
    };
}

/**
 * Add a single stop to a route direction
 */
export async function addStopToRoute(projectId, routeId, stopId, directionId = 0, sequence = null) {
    const direction = parseInt(directionId);
    
    if (![0, 1].includes(direction)) {
        throw new Error("Direction ID must be 0 (outbound) or 1 (inbound)");
    }

    // Verify route and stop exist
    const [route, stop] = await Promise.all([
        prisma.route.findFirst({
            where: { route_id: routeId, project_id: projectId }
        }),
        prisma.stop.findFirst({
            where: { stop_id: stopId, project_id: projectId }
        })
    ]);

    if (!route) {
        throw new Error("Route not found in this project");
    }

    if (!stop) {
        throw new Error("Stop not found in this project");
    }

    // If no sequence provided, add to end
    let stopSequence = sequence;
    if (stopSequence === null) {
        const lastStop = await prisma.routeStop.findFirst({
            where: {
                route_id: routeId,
                project_id: projectId,
                direction_id: direction
            },
            orderBy: { stop_sequence: 'desc' }
        });

        stopSequence = lastStop ? lastStop.stop_sequence + 1 : 1;
    }

    const routeStop = await prisma.routeStop.create({
        data: {
            route_id: routeId,
            stop_id: stopId,
            stop_sequence: stopSequence,
            project_id: projectId,
            direction_id: direction
        },
        include: { stop: true }
    });

    return {
        ...routeStop.stop,
        stop_sequence: routeStop.stop_sequence,
        direction_id: routeStop.direction_id
    };
}

/**
 * Remove a stop from a route direction
 */
export async function removeStopFromRoute(projectId, routeId, stopId, directionId) {
    const direction = parseInt(directionId);
    
    if (![0, 1].includes(direction)) {
        throw new Error("Direction ID must be 0 (outbound) or 1 (inbound)");
    }

    const deleted = await prisma.routeStop.deleteMany({
        where: {
            route_id: routeId,
            stop_id: stopId,
            project_id: projectId,
            direction_id: direction
        }
    });

    if (deleted.count === 0) {
        throw new Error("Stop not found in this route direction");
    }

    return { message: "Stop removed from route" };
}

/**
 * Reorder stops for a route direction
 */
export async function reorderRouteStops(projectId, routeId, directionId, stopOrdering) {
    // stopOrdering should be an array of { stop_id, stop_sequence }
    const direction = parseInt(directionId);
    
    if (![0, 1].includes(direction)) {
        throw new Error("Direction ID must be 0 (outbound) or 1 (inbound)");
    }

    if (!Array.isArray(stopOrdering)) {
        throw new Error("Stop ordering must be an array");
    }

    // Validate all stops exist in this route direction
    const existingStops = await prisma.routeStop.findMany({
        where: {
            route_id: routeId,
            project_id: projectId,
            direction_id: direction
        }
    });

    const existingStopIds = new Set(existingStops.map(rs => rs.stop_id));
    const reorderStopIds = new Set(stopOrdering.map(s => s.stop_id));

    if (existingStopIds.size !== reorderStopIds.size) {
        throw new Error("Stop ordering must include all existing stops");
    }

    // Update sequences in transaction
    return await prisma.$transaction(async (tx) => {
        for (const { stop_id, stop_sequence } of stopOrdering) {
            await tx.routeStop.updateMany({
                where: {
                    route_id: routeId,
                    stop_id: stop_id,
                    project_id: projectId,
                    direction_id: direction
                },
                data: { stop_sequence }
            });
        }

        // Return updated stops
        return await tx.routeStop.findMany({
            where: {
                route_id: routeId,
                project_id: projectId,
                direction_id: direction
            },
            include: { stop: true },
            orderBy: { stop_sequence: 'asc' }
        });
    });
}
