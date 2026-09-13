import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as controller from '../controllers/companyController.js';

const router = Router();

router.get('/', asyncHandler(controller.getInfo));

export default router;
