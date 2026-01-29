import { promises as fs } from 'fs';
import path from 'path';

export const getRoute = async (req, res) => {
    try {
        const { number, dir } = req.query;

        if (!number || !dir) {
            return res.status(400).json({ error: "Missing number or dir parameter" });
        }

        const filename = `tije_${number}_${dir}_route.geojson`;
        const filePath = path.join(process.cwd(), 'src', 'data', 'route', filename);

        try {
            const data = await fs.readFile(filePath, 'utf8');
            const geojson = JSON.parse(data);
            res.json(geojson);
        } catch (fileError) {
            console.error(`Error reading file ${filename}:`, fileError);
            res.status(404).json({ error: "Route not found" });
        }
    } catch (error) {
        console.error("Error fetching route:", error);
        res.status(500).json({ error: "Failed to fetch route" });
    }
};
