import express from 'express';
import { getRoute } from '../controllers/publicController.js';

const router = express.Router();

router.get('/route', getRoute);

export default router;
