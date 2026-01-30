import express from 'express';
import { getRouteById } from '../controllers/gtfsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/:id', getRouteById);
// router.get('/', getRoutes); // Optional: if we want to list all routes here too

export default router;
