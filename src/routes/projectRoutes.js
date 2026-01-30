import express from 'express';
import {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    shareProject,
    unshareProject
} from '../controllers/projectController.js';
import { uploadGTFS, getStops, getRoutes } from '../controllers/gtfsController.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';

// Configure Multer for memory storage (consistent with gtfsRoutes)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Routes
router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Sharing
router.post('/:id/share', shareProject);
router.delete('/:id/share/:userId', unshareProject);

// Import - Map to uploadGTFS
// Middleware to map params.id to body.project_id for uploadGTFS
const mapProjectId = (req, res, next) => {
    if (req.params.id) {
        req.body.project_id = req.params.id;
    }
    next();
};
router.post('/:id/import', upload.single('file'), mapProjectId, uploadGTFS);

// GTFS Data
// Filter by project_id using query param injection is redundant if controller takes it from query, 
// but here it is in path. We need to adapter.
const mapQueryProjectId = (req, res, next) => {
    req.query.project_id = req.params.id;
    next();
};
router.get('/:id/stops', mapQueryProjectId, getStops);
router.get('/:id/routes', mapQueryProjectId, getRoutes);

export default router;
