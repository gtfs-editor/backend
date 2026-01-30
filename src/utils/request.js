/**
 * Validates the request body against a schema.
 * @param {Object} body - The request body to validate.
 * @param {Object} schema - The validation schema.
 * @param {Array} schema.required - List of required field names.
 * @param {Object} schema.fields - Map of field names to their expected types or validation functions.
 * @throws {Error} Throws an error with 'VALIDATION_ERROR' name if validation fails.
 * @returns {Object} The validated body.
 */
export function validateRequestBody(body, schema) {
    const { required = [], fields = {} } = schema;
    const errors = [];

    // Check required fields
    for (const field of required) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
            errors.push(`Field '${field}' is required`);
        }
    }

    // Check field types
    for (const [field, type] of Object.entries(fields)) {
        if (body[field] !== undefined) {
            if (typeof type === 'string') {
                if (typeof body[field] !== type) {
                    errors.push(`Field '${field}' must be of type ${type}`);
                }
            } else if (typeof type === 'function') {
                if (!type(body[field])) {
                    errors.push(`Field '${field}' is invalid`);
                }
            }
        }
    }

    if (errors.length > 0) {
        const error = new Error('Validation failed');
        error.name = 'VALIDATION_ERROR';
        error.details = errors;
        throw error;
    }

    return body;
}
