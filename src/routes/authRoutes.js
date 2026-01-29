import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { requireAuth, rateLimitMiddleware } from '../middleware/auth.js';
import { loginRateLimiter, registerRateLimiter } from '../utils/auth.js';

const router = express.Router();

router.post('/register', rateLimitMiddleware(registerRateLimiter), register);
router.post('/login', rateLimitMiddleware(loginRateLimiter), login);
router.get('/me', requireAuth, getMe);

export default router;
