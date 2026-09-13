import { ApiError } from '../middleware/ApiError.js';
import { GST_NUMBER_REGEX, PINCODE_REGEX, INDIAN_STATES, HSN_CODE_REGEX } from '../../shared/constants.js';

export function requireString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${fieldName} is required.`);
  }
  return value.trim();
}

export function validatePincode(pincode) {
  if (!PINCODE_REGEX.test(pincode)) {
    throw new ApiError(400, 'Please enter a valid 6-digit pincode.');
  }
}

export function validateState(state) {
  if (!INDIAN_STATES.includes(state)) {
    throw new ApiError(400, 'Please select a valid state.');
  }
}

export function validateGstNumber(gstNumber) {
  if (gstNumber && !GST_NUMBER_REGEX.test(gstNumber)) {
    throw new ApiError(400, 'Please enter a valid GST number.');
  }
}

export function validateEmail(email) {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }
}

export function validatePhone(phone) {
  if (phone && !/^[0-9+\-\s()]{6,20}$/.test(phone)) {
    throw new ApiError(400, 'Please enter a valid phone number.');
  }
}

export function validatePositiveNumber(value, fieldName) {
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) {
    throw new ApiError(400, `${fieldName} must be greater than zero.`);
  }
  return n;
}

export function validateNonNegativeNumber(value, fieldName) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) {
    throw new ApiError(400, `${fieldName} cannot be negative.`);
  }
  return n;
}

// Returns a cleaned hsn_code (or null), throwing if a non-empty value doesn't
// match the required 4/6/8-digit shape. HSN Code is always optional.
export function validateHsnCode(hsnCode) {
  if (hsnCode === undefined || hsnCode === null || hsnCode === '') {
    return null;
  }
  const cleaned = String(hsnCode).trim();
  if (!HSN_CODE_REGEX.test(cleaned)) {
    throw new ApiError(400, 'HSN Code must be 4, 6, or 8 digits.');
  }
  return cleaned;
}
