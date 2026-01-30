import * as projectService from '../services/projects/index.js';

export const getProjects = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await projectService.getProjects(userId, req.query);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const createProject = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await projectService.createProject(userId, req.body);
        res.status(201).json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getProjectById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;
        const result = await projectService.getProjectById(userId, projectId);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const updateProject = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;
        const result = await projectService.updateProject(userId, projectId, req.body);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const deleteProject = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;
        const result = await projectService.deleteProject(userId, projectId);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const shareProject = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;
        const { email, role } = req.body;
        const result = await projectService.shareProject(userId, projectId, email, role);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const unshareProject = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;
        const { userId: targetUserId } = req.params; // or body? url is usually /projects/:id/share/:userId
        const result = await projectService.unshareProject(userId, projectId, targetUserId);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};
