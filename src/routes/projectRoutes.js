import express from 'express';
import {
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
    shareProject,
    unshareProject,
    importGTFS,
    getStops
} from '../controllers/projectController.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Routes
router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Sharing
router.post('/:id/share', shareProject);
router.delete('/:id/share/:userId', unshareProject);

// Import
router.post('/:id/import', upload.single('file'), importGTFS);

// GTFS Data
router.get('/:id/stops', getStops);

export default router;
