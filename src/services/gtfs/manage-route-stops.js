import { prisma } from "../../utils/prisma.js"

export async function assignStopsToRoute(projectId, routeId, stops, directionId = 0) {
    // 1. Validate Project & Route existence
    const route = await prisma.route.findFirst({
        where: { route_id: routeId, project_id: projectId }
    })

    if (!route) {
        throw new Error("Route not found in this project")
    }

    // 2. Clear existing stops for this route AND direction
    // Note: We use a transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
        await tx.routeStop.deleteMany({
            where: {
                route_id: routeId,
                project_id: projectId,
                direction_id: directionId
            }
        })

        // 3. Insert new stops
        if (!stops || stops.length === 0) {
            return []
        }

        const createData = stops.map((s, index) => ({
            route_id: routeId,
            stop_id: s.stop_id,
            stop_sequence: s.stop_sequence || index + 1,
            project_id: projectId,
            direction_id: directionId
        }))

        // Use createMany for bulk insertion
        await tx.routeStop.createMany({
            data: createData
        })

        // 4. Return all stops for this route (both directions)
        return await tx.routeStop.findMany({
            where: { route_id: routeId, project_id: projectId },
            include: { stop: true },
            orderBy: [{ direction_id: 'asc' }, { stop_sequence: 'asc' }]
        })
    })
}

export async function getRouteStops(projectId, routeId) {
    return await prisma.routeStop.findMany({
        where: {
            route_id: routeId,
            project_id: projectId
        },
        include: { stop: true },
        orderBy: [{ direction_id: 'asc' }, { stop_sequence: 'asc' }]
    })
}

export async function getRouteStopsByDirection(projectId, routeId, directionId) {
    return await prisma.routeStop.findMany({
        where: {
            route_id: routeId,
            project_id: projectId,
            direction_id: parseInt(directionId)
        },
        include: { stop: true },
        orderBy: { stop_sequence: 'asc' }
    })
}
