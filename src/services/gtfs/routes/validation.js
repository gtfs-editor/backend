/**
 * Validate route data
 */
export function validateRouteData(data) {
    const errors = [];

    // Validate required fields
    if (data.route_type === undefined || data.route_type === null) {
        errors.push("Route type is required");
    }

    // Validate at least one name is provided
    if (!data.route_short_name && !data.route_long_name) {
        errors.push("At least one of route_short_name or route_long_name is required");
    }

    // Validate route_type is a valid integer
    if (data.route_type !== undefined) {
        const routeTypeInt = parseInt(data.route_type);
        if (isNaN(routeTypeInt) || routeTypeInt < 0 || routeTypeInt > 7) {
            errors.push("Route type must be a valid GTFS route type (0-7)");
        }
    }

    // Validate color formats if provided
    if (data.route_color && !/^[0-9A-Fa-f]{6}$/.test(data.route_color)) {
        errors.push("Route color must be a 6-character hex color (without #)");
    }

    if (data.route_text_color && !/^[0-9A-Fa-f]{6}$/.test(data.route_text_color)) {
        errors.push("Route text color must be a 6-character hex color (without #)");
    }

    if (errors.length > 0) {
        const error = new Error("Validation failed");
        error.name = "VALIDATION_ERROR";
        error.details = errors;
        throw error;
    }

    return data;
}

/**
 * Validate stop sequence data
 */
export function validateStopSequence(stops) {
    if (!Array.isArray(stops)) {
        throw new Error("Stops must be an array");
    }

    const errors = [];
    const seenSequences = new Set();

    stops.forEach((stop, index) => {
        if (!stop.stop_id) {
            errors.push(`Stop at index ${index}: stop_id is required`);
        }

        const sequence = stop.stop_sequence || (index + 1);
        
        if (seenSequences.has(sequence)) {
            errors.push(`Duplicate stop_sequence: ${sequence}`);
        }
        seenSequences.add(sequence);
    });

    if (errors.length > 0) {
        const error = new Error("Stop sequence validation failed");
        error.name = "VALIDATION_ERROR";
        error.details = errors;
        throw error;
    }

    return true;
}
