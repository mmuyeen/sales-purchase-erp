import { validatePositiveNumber, validateNonNegativeNumber, validateHsnCode } from './common.js';
import { PAYMENT_TERM_OPTIONS, UOM_OPTIONS, TAX_RATE_OPTIONS } from '../../shared/constants.js';
import { ApiError } from '../middleware/ApiError.js';

function validateItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ApiError(400, 'At least one line item is required.');
  }

  return rawItems.map((item, idx) => {
    const line = idx + 1;
    if (!item.productId) throw new ApiError(400, `Line ${line}: product is required.`);
    if (!UOM_OPTIONS.includes(item.uom)) throw new ApiError(400, `Line ${line}: invalid UOM.`);

    const quantity = validatePositiveNumber(item.quantity, `Line ${line}: quantity`);
    const rate = validateNonNegativeNumber(item.rate, `Line ${line}: rate`);
    const discountAmount = validateNonNegativeNumber(item.discountAmount || 0, `Line ${line}: discount`);

    const taxPercentage = Number(item.taxPercentage);
    if (!TAX_RATE_OPTIONS.includes(taxPercentage)) {
      throw new ApiError(400, `Line ${line}: invalid tax percentage.`);
    }

    return {
      productId: item.productId,
      description: item.description ? String(item.description).trim() : null,
      hsnCode: validateHsnCode(item.hsnCode),
      uom: item.uom,
      quantity,
      rate,
      discountAmount,
      taxPercentage,
    };
  });
}

export function validateSalesOrderInput(body) {
  if (!body.customerId) throw new ApiError(400, 'Customer is required.');
  if (!body.soDate) throw new ApiError(400, 'Sales order date is required.');
  if (body.paymentTerms && !PAYMENT_TERM_OPTIONS.includes(body.paymentTerms)) {
    throw new ApiError(400, 'Please select a valid payment term.');
  }

  return {
    customerId: body.customerId,
    soDate: body.soDate,
    paymentTerms: body.paymentTerms || null,
    deliveryDate: body.deliveryDate || null,
    remarks: body.remarks ? String(body.remarks).trim() : null,
    items: validateItems(body.items),
  };
}
