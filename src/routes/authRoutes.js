import express from 'express';
import {
    register,
    login,
    logout,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
} from '../controllers/authController.js';
import { requireAuth, rateLimitMiddleware } from '../middleware/auth.js';
import { loginRateLimiter, registerRateLimiter, passwordResetRateLimiter } from '../utils/auth.js';

const router = express.Router();

router.post('/register', rateLimitMiddleware(registerRateLimiter), register);
router.post('/login', rateLimitMiddleware(loginRateLimiter), login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);
router.post('/forgot-password', rateLimitMiddleware(passwordResetRateLimiter), forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
