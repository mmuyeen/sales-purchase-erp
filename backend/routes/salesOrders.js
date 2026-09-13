import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as controller from '../controllers/salesOrdersController.js';

const router = Router();

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.put('/:id/status', asyncHandler(controller.updateStatus));
router.delete('/:id', asyncHandler(controller.remove));

export default router;
