import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as controller from '../controllers/companyController.js';

// requireAuth is applied once, centrally, where this router is mounted in
// app.js — every route below is protected as a result.
const router = Router();

router.get('/', asyncHandler(controller.getInfo));
router.put('/', asyncHandler(controller.updateInfo));

export default router;
