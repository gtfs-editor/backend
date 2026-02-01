/**
 * Validate stop data
 */
export function validateStopData(data) {
    const errors = [];

    // Validate coordinates (required)
    if (data.stop_lat === undefined || data.stop_lat === null) {
        errors.push("Latitude is required");
    } else {
        const lat = parseFloat(data.stop_lat);
        if (isNaN(lat) || lat < -90 || lat > 90) {
            errors.push("Latitude must be a number between -90 and 90");
        }
    }

    if (data.stop_lon === undefined || data.stop_lon === null) {
        errors.push("Longitude is required");
    } else {
        const lon = parseFloat(data.stop_lon);
        if (isNaN(lon) || lon < -180 || lon > 180) {
            errors.push("Longitude must be a number between -180 and 180");
        }
    }

    // Validate location_type if provided
    if (data.location_type !== undefined && data.location_type !== null) {
        const locType = parseInt(data.location_type);
        if (![0, 1, 2, 3, 4].includes(locType)) {
            errors.push("location_type must be 0 (stop), 1 (station), 2 (entrance/exit), 3 (generic node), or 4 (boarding area)");
        }
    }

    // Validate wheelchair_boarding if provided
    if (data.wheelchair_boarding !== undefined && data.wheelchair_boarding !== null) {
        const wb = parseInt(data.wheelchair_boarding);
        if (![0, 1, 2].includes(wb)) {
            errors.push("wheelchair_boarding must be 0 (no info), 1 (accessible), or 2 (not accessible)");
        }
    }

    // Validate stop_name (recommended but not strictly required by GTFS)
    if (!data.stop_name || data.stop_name.trim().length === 0) {
        // Provide warning but don't fail
        console.warn("Warning: stop_name is recommended for better usability");
    }

    if (errors.length > 0) {
        const error = new Error("Stop validation failed");
        error.name = "VALIDATION_ERROR";
        error.details = errors;
        throw error;
    }

    return data;
}

/**
 * Validate bulk stop import data
 */
export function validateBulkStops(stops) {
    if (!Array.isArray(stops)) {
        throw new Error("Stops must be an array");
    }

    if (stops.length === 0) {
        throw new Error("Stops array cannot be empty");
    }

    const errors = [];
    const stopIds = new Set();

    stops.forEach((stop, index) => {
        try {
            validateStopData(stop);

            // Check for duplicate stop_ids
            if (stop.stop_id) {
                if (stopIds.has(stop.stop_id)) {
                    errors.push(`Duplicate stop_id at index ${index}: ${stop.stop_id}`);
                }
                stopIds.add(stop.stop_id);
            }
        } catch (error) {
            errors.push(`Stop at index ${index}: ${error.message}`);
        }
    });

    if (errors.length > 0) {
        const error = new Error("Bulk stop validation failed");
        error.name = "VALIDATION_ERROR";
        error.details = errors;
        throw error;
    }

    return true;
}
