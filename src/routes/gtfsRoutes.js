import express from 'express';
import multer from 'multer';
import { uploadGTFS, getRoutes, getStops, resetGTFS } from '../controllers/gtfsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

router.use(requireAuth);

router.post('/upload', upload.single('file'), uploadGTFS);
router.get('/routes', getRoutes);
router.get('/stops', getStops);
router.post('/reset', resetGTFS);

export default router;
