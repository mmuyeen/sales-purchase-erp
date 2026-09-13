import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as controller from '../controllers/dashboardController.js';

const router = Router();

router.get('/summary', asyncHandler(controller.summary));

export default router;
