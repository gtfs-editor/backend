import { prisma } from "../../../utils/prisma.js";
import { validateRouteData } from "./validation.js";

/**
 * Create a new route
 */
export async function createRoute(projectId, data, userId = null) {
    // Validate route data
    const validatedData = validateRouteData(data);

    const {
        route_id,
        route_short_name,
        route_long_name,
        route_desc,
        route_type,
        route_url,
        route_color,
        route_text_color,
        route_sort_order,
        agency_id,
        continuous_pickup,
        continuous_drop_off,
        network_id
    } = validatedData;

    // Verify agency exists if provided
    if (agency_id) {
        const agency = await prisma.agency.findFirst({
            where: {
                agency_id: agency_id,
                project_id: projectId
            }
        });

        if (!agency) {
            throw new Error("Agency not found in this project");
        }
    }

    // Generate route_id if not provided
    const finalRouteId = route_id || `route-${Date.now()}`;

    // Create route
    const route = await prisma.route.create({
        data: {
            route_id: finalRouteId,
            route_short_name,
            route_long_name,
            route_desc,
            route_type: parseInt(route_type),
            route_url,
            route_color: route_color || "FFFFFF",
            route_text_color: route_text_color || "000000",
            route_sort_order: route_sort_order ? parseInt(route_sort_order) : null,
            agency_id,
            continuous_pickup: continuous_pickup ? parseInt(continuous_pickup) : 1,
            continuous_drop_off: continuous_drop_off ? parseInt(continuous_drop_off) : 1,
            network_id,
            project_id: projectId,
            created_by: userId
        }
    });

    return route;
}

/**
 * Update an existing route
 */
export async function updateRoute(projectId, routeId, data, userId = null) {
    // Ensure route exists and belongs to project
    const existing = await prisma.route.findFirst({
        where: {
            route_id: routeId,
            project_id: projectId
        }
    });

    if (!existing) {
        throw new Error("Route not found in this project");
    }

    const updateData = {};

    // Update allowed fields
    if (data.route_short_name !== undefined) updateData.route_short_name = data.route_short_name;
    if (data.route_long_name !== undefined) updateData.route_long_name = data.route_long_name;
    if (data.route_desc !== undefined) updateData.route_desc = data.route_desc;
    if (data.route_url !== undefined) updateData.route_url = data.route_url;
    if (data.route_sort_order !== undefined) {
        updateData.route_sort_order = data.route_sort_order ? parseInt(data.route_sort_order) : null;
    }
    if (data.network_id !== undefined) updateData.network_id = data.network_id;
    if (data.continuous_pickup !== undefined) {
        updateData.continuous_pickup = parseInt(data.continuous_pickup);
    }
    if (data.continuous_drop_off !== undefined) {
        updateData.continuous_drop_off = parseInt(data.continuous_drop_off);
    }

    // Validate and update route_type
    if (data.route_type !== undefined) {
        const routeTypeInt = parseInt(data.route_type);
        if (isNaN(routeTypeInt) || routeTypeInt < 0 || routeTypeInt > 7) {
            throw new Error("Route type must be a valid GTFS route type (0-7)");
        }
        updateData.route_type = routeTypeInt;
    }

    // Validate and update colors
    if (data.route_color !== undefined) {
        if (data.route_color && !/^[0-9A-Fa-f]{6}$/.test(data.route_color)) {
            throw new Error("Route color must be a 6-character hex color (without #)");
        }
        updateData.route_color = data.route_color || "FFFFFF";
    }

    if (data.route_text_color !== undefined) {
        if (data.route_text_color && !/^[0-9A-Fa-f]{6}$/.test(data.route_text_color)) {
            throw new Error("Route text color must be a 6-character hex color (without #)");
        }
        updateData.route_text_color = data.route_text_color || "000000";
    }

    // Verify and update agency_id
    if (data.agency_id !== undefined) {
        if (data.agency_id) {
            const agency = await prisma.agency.findFirst({
                where: {
                    agency_id: data.agency_id,
                    project_id: projectId
                }
            });

            if (!agency) {
                throw new Error("Agency not found in this project");
            }
        }
        updateData.agency_id = data.agency_id;
    }

    // Validate at least one name remains after update
    const finalShortName = updateData.route_short_name !== undefined
        ? updateData.route_short_name
        : existing.route_short_name;
    const finalLongName = updateData.route_long_name !== undefined
        ? updateData.route_long_name
        : existing.route_long_name;

    if (!finalShortName && !finalLongName) {
        throw new Error("At least one of route_short_name or route_long_name is required");
    }

    // Update route
    const route = await prisma.route.update({
        where: {
            route_id_project_id: {
                route_id: routeId,
                project_id: projectId
            }
        },
        data: updateData
    });

    return route;
}

/**
 * Delete a route
 */
export async function deleteRoute(projectId, routeId) {
    const existing = await prisma.route.findFirst({
        where: {
            route_id: routeId,
            project_id: projectId
        }
    });

    if (!existing) {
        throw new Error("Route not found in this project");
    }

    // Delete route (cascade will handle related data)
    await prisma.route.delete({
        where: {
            route_id_project_id: {
                route_id: routeId,
                project_id: projectId
            }
        }
    });

    return { message: "Route deleted successfully" };
}
