import { requireString, validateNonNegativeNumber, validateHsnCode } from './common.js';
import { UOM_OPTIONS, TAX_RATE_OPTIONS, PAYMENT_TERM_OPTIONS } from '../../shared/constants.js';
import { ApiError } from '../middleware/ApiError.js';

export function validateProductInput(body) {
  const name = requireString(body.name, 'Product name');

  const uom = requireString(body.uom, 'UOM');
  if (!UOM_OPTIONS.includes(uom)) {
    throw new ApiError(400, 'Please select a valid UOM.');
  }

  const taxPercentage = Number(body.taxPercentage);
  if (!TAX_RATE_OPTIONS.includes(taxPercentage)) {
    throw new ApiError(400, 'Please select a valid tax percentage.');
  }

  const paymentTerm = body.paymentTerm || null;
  if (paymentTerm && !PAYMENT_TERM_OPTIONS.includes(paymentTerm)) {
    throw new ApiError(400, 'Please select a valid payment term.');
  }

  const purchasePrice = validateNonNegativeNumber(body.purchasePrice, 'Purchase price');
  const salesPrice = validateNonNegativeNumber(body.salesPrice, 'Sales price');
  const description = body.description ? String(body.description).trim() : null;
  const hsnCode = validateHsnCode(body.hsnCode);

  return { name, description, uom, taxPercentage, paymentTerm, purchasePrice, salesPrice, hsnCode };
}
