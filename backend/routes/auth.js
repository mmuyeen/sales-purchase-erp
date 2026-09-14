import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import * as controller from '../controllers/authController.js';

const router = Router();

router.post('/register', authRateLimit, asyncHandler(controller.register));
router.post('/login', authRateLimit, asyncHandler(controller.login));
router.post('/logout', asyncHandler(controller.logout));
router.get('/me', requireAuth, asyncHandler(controller.me));
router.post('/forgot-password', authRateLimit, asyncHandler(controller.forgotPassword));
router.post('/reset-password', authRateLimit, asyncHandler(controller.resetPassword));

export default router;
