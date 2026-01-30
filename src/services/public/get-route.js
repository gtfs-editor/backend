import { readFile } from 'fs/promises';
import path from 'path';

export async function getPublicRoute(number, dir) {
    if (!number || !dir) {
        const error = new Error("Missing number or dir parameter");
        error.name = "BAD_REQUEST";
        throw error;
    }

    // Resolve the path to the GeoJSON file
    // Assuming 'src/data' based on directory listing
    const filename = `tije_${number}_${dir}_route.geojson`;
    const filePath = path.join(process.cwd(), 'src', 'data', 'route', filename);

    try {
        // Read the GeoJSON file
        const geojsonData = await readFile(filePath, 'utf-8');
        return JSON.parse(geojsonData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const notFoundError = new Error("Route not found");
            notFoundError.name = "NOT_FOUND";
            throw notFoundError;
        }
        throw error;
    }
}
