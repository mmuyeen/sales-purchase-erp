import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as controller from '../controllers/reportsController.js';

const router = Router();

router.get('/sales', asyncHandler(controller.salesReport));
router.get('/purchase-orders', asyncHandler(controller.purchaseOrderReport));
router.get('/product-sales-payments', asyncHandler(controller.productSalesPaymentsReport));

export default router;
