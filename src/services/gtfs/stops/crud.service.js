import { prisma } from "../../../utils/prisma.js";
import { validateStopData } from "./validation.js";

/**
 * Create a new stop
 */
export async function createStop(projectId, data, userId = null) {
    // Validate stop data
    const validatedData = validateStopData(data);

    const { 
        stop_id, 
        stop_name, 
        stop_lat, 
        stop_lon, 
        stop_desc, 
        stop_code, 
        location_type, 
        parent_station,
        zone_id,
        stop_url,
        wheelchair_boarding,
        platform_code,
        level_id,
        tts_stop_name
    } = validatedData;

    // Generate stop_id if not provided
    const finalStopId = stop_id || `stop-${Date.now()}`;

    // Verify parent station exists if provided
    if (parent_station) {
        const parentStop = await prisma.stop.findFirst({
            where: {
                stop_id: parent_station,
                project_id: projectId
            }
        });

        if (!parentStop) {
            throw new Error("Parent station not found in this project");
        }

        // Parent must be a station (location_type = 1)
        if (parentStop.location_type !== 1) {
            throw new Error("Parent station must have location_type = 1");
        }
    }

    const stop = await prisma.stop.create({
        data: {
            stop_id: finalStopId,
            stop_name: stop_name || "New Stop",
            stop_lat: parseFloat(stop_lat),
            stop_lon: parseFloat(stop_lon),
            stop_desc,
            stop_code,
            location_type: location_type ? parseInt(location_type) : 0,
            parent_station,
            zone_id,
            stop_url,
            wheelchair_boarding: wheelchair_boarding ? parseInt(wheelchair_boarding) : 0,
            platform_code,
            level_id,
            tts_stop_name,
            project_id: projectId,
            created_by: userId
        }
    });

    return stop;
}

/**
 * Update an existing stop
 */
export async function updateStop(projectId, stopId, data, userId = null) {
    // Ensure stop exists and belongs to project
    const existing = await prisma.stop.findFirst({
        where: {
            stop_id: stopId,
            project_id: projectId
        }
    });

    if (!existing) {
        throw new Error("Stop not found in this project");
    }

    const updateData = {};

    // Update allowed fields
    if (data.stop_name !== undefined) updateData.stop_name = data.stop_name;
    if (data.stop_desc !== undefined) updateData.stop_desc = data.stop_desc;
    if (data.stop_code !== undefined) updateData.stop_code = data.stop_code;
    if (data.zone_id !== undefined) updateData.zone_id = data.zone_id;
    if (data.stop_url !== undefined) updateData.stop_url = data.stop_url;
    if (data.platform_code !== undefined) updateData.platform_code = data.platform_code;
    if (data.level_id !== undefined) updateData.level_id = data.level_id;
    if (data.tts_stop_name !== undefined) updateData.tts_stop_name = data.tts_stop_name;

    // Validate and update coordinates
    if (data.stop_lat !== undefined) {
        const lat = parseFloat(data.stop_lat);
        if (isNaN(lat) || lat < -90 || lat > 90) {
            throw new Error("Invalid latitude: must be between -90 and 90");
        }
        updateData.stop_lat = lat;
    }

    if (data.stop_lon !== undefined) {
        const lon = parseFloat(data.stop_lon);
        if (isNaN(lon) || lon < -180 || lon > 180) {
            throw new Error("Invalid longitude: must be between -180 and 180");
        }
        updateData.stop_lon = lon;
    }

    // Validate and update location_type
    if (data.location_type !== undefined) {
        const locType = parseInt(data.location_type);
        if (![0, 1, 2, 3, 4].includes(locType)) {
            throw new Error("Invalid location_type: must be 0-4");
        }
        updateData.location_type = locType;
    }

    // Validate and update wheelchair_boarding
    if (data.wheelchair_boarding !== undefined) {
        const wb = parseInt(data.wheelchair_boarding);
        if (![0, 1, 2].includes(wb)) {
            throw new Error("Invalid wheelchair_boarding: must be 0, 1, or 2");
        }
        updateData.wheelchair_boarding = wb;
    }

    // Verify and update parent_station
    if (data.parent_station !== undefined) {
        if (data.parent_station) {
            const parentStop = await prisma.stop.findFirst({
                where: {
                    stop_id: data.parent_station,
                    project_id: projectId
                }
            });

            if (!parentStop) {
                throw new Error("Parent station not found in this project");
            }

            if (parentStop.location_type !== 1) {
                throw new Error("Parent station must have location_type = 1");
            }

            // Prevent circular references
            if (data.parent_station === stopId) {
                throw new Error("Stop cannot be its own parent");
            }
        }
        updateData.parent_station = data.parent_station;
    }

    const stop = await prisma.stop.update({
        where: {
            stop_id_project_id: {
                stop_id: stopId,
                project_id: projectId
            }
        },
        data: updateData
    });

    return stop;
}

/**
 * Delete a stop
 */
export async function deleteStop(projectId, stopId) {
    const existing = await prisma.stop.findFirst({
        where: {
            stop_id: stopId,
            project_id: projectId
        }
    });

    if (!existing) {
        throw new Error("Stop not found in this project");
    }

    // Check if stop is used in any trips
    const stopTimesCount = await prisma.stopTime.count({
        where: {
            stop_id: stopId,
            project_id: projectId
        }
    });

    if (stopTimesCount > 0) {
        throw new Error(`Cannot delete stop: it is used in ${stopTimesCount} stop times`);
    }

    // Check if stop is used in any routes
    const routeStopsCount = await prisma.routeStop.count({
        where: {
            stop_id: stopId,
            project_id: projectId
        }
    });

    if (routeStopsCount > 0) {
        throw new Error(`Cannot delete stop: it is used in ${routeStopsCount} routes`);
    }

    // Check if stop has child stops
    const childStopsCount = await prisma.stop.count({
        where: {
            parent_station: stopId,
            project_id: projectId
        }
    });

    if (childStopsCount > 0) {
        throw new Error(`Cannot delete stop: it has ${childStopsCount} child stops`);
    }

    await prisma.stop.delete({
        where: {
            stop_id_project_id: {
                stop_id: stopId,
                project_id: projectId
            }
        }
    });

    return { message: "Stop deleted successfully" };
}

/**
 * Bulk create stops
 */
export async function bulkCreateStops(projectId, stops, userId = null) {
    if (!Array.isArray(stops) || stops.length === 0) {
        throw new Error("Stops must be a non-empty array");
    }

    // Validate all stops
    const validatedStops = stops.map((stop, index) => {
        try {
            return validateStopData(stop);
        } catch (error) {
            throw new Error(`Stop at index ${index}: ${error.message}`);
        }
    });

    // Create stops
    const createData = validatedStops.map(stop => ({
        stop_id: stop.stop_id || `stop-${Date.now()}-${Math.random()}`,
        stop_name: stop.stop_name || "New Stop",
        stop_lat: parseFloat(stop.stop_lat),
        stop_lon: parseFloat(stop.stop_lon),
        stop_desc: stop.stop_desc,
        stop_code: stop.stop_code,
        location_type: stop.location_type ? parseInt(stop.location_type) : 0,
        parent_station: stop.parent_station,
        zone_id: stop.zone_id,
        stop_url: stop.stop_url,
        wheelchair_boarding: stop.wheelchair_boarding ? parseInt(stop.wheelchair_boarding) : 0,
        platform_code: stop.platform_code,
        level_id: stop.level_id,
        tts_stop_name: stop.tts_stop_name,
        project_id: projectId,
        created_by: userId
    }));

    const result = await prisma.stop.createMany({
        data: createData,
        skipDuplicates: true
    });

    return {
        created: result.count,
        message: `${result.count} stops created successfully`
    };
}
