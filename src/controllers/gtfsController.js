import * as gtfsService from '../services/gtfs/index.js';

export const uploadGTFS = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { project_id } = req.body;

        if (!req.file) {
            throw new Error("No file uploaded");
        }

        const buffer = req.file.buffer;
        const fileName = req.file.originalname;

        const result = await gtfsService.uploadGTFS(userId, project_id, buffer, fileName);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getRoutes = async (req, res, next) => {
    try {
        // We expect projectId to be passed in query or path, or attached to request if nested route
        const { project_id } = req.query;
        // NOTE: The previous service assumed filtering by project_id is mandatory or handled.
        // My new service enforces it. If existing frontend doesn't send project_id, we need to know.
        // Assuming project_id is sent in query for now.

        if (!project_id) {
            throw new Error("Project ID is required");
        }

        const result = await gtfsService.getRoutes(project_id, req.query);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getStops = async (req, res, next) => {
    try {
        const { project_id } = req.query;
        if (!project_id) {
            throw new Error("Project ID is required");
        }

        const result = await gtfsService.getStops(project_id, req.query);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getRouteById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { project_id } = req.query; // Scope by project for safety

        if (!project_id) {
            throw new Error("Project ID is required");
        }

        const result = await gtfsService.getRouteById(project_id, id);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const resetGTFS = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { project_id } = req.body; // Explicit confirmation

        const result = await gtfsService.resetGTFS(userId, project_id);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};
