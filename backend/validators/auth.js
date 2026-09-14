import { ApiError } from '../middleware/ApiError.js';
import { GST_NUMBER_REGEX, INDIAN_STATES } from '../../shared/constants.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATE_CODE_REGEX = /^[0-9]{2}$/;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function validateLoginInput(body) {
  const email = normalizeEmail(body.email);
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }
  if (!body.password || typeof body.password !== 'string') {
    throw new ApiError(400, 'Password is required.');
  }
  return { email, password: body.password };
}

export function validateRegisterInput(body) {
  const email = normalizeEmail(body.email);
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  const password = body.password;
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters.');
  }
  if (body.confirmPassword !== password) {
    throw new ApiError(400, 'Passwords do not match.');
  }

  const companyName = String(body.companyName || '').trim();
  if (!companyName) throw new ApiError(400, 'Company name is required.');

  const companyAddress = String(body.companyAddress || '').trim();
  if (!companyAddress) throw new ApiError(400, 'Company address is required.');

  const companyState = String(body.companyState || '').trim();
  if (!INDIAN_STATES.includes(companyState)) {
    throw new ApiError(400, 'Please select a valid state.');
  }

  const companyStateCode = String(body.companyStateCode || '').trim();
  if (!STATE_CODE_REGEX.test(companyStateCode)) {
    throw new ApiError(400, 'State code must be a 2-digit number (e.g. 33).');
  }

  const companyGstNumber = body.companyGstNumber ? String(body.companyGstNumber).trim().toUpperCase() : null;
  if (companyGstNumber && !GST_NUMBER_REGEX.test(companyGstNumber)) {
    throw new ApiError(400, 'Please enter a valid GST number.');
  }

  return {
    email,
    password,
    companyName,
    companyAddress,
    companyState,
    companyStateCode,
    companyGstNumber,
  };
}

export function validateCompanyUpdateInput(body) {
  const companyName = String(body.companyName || '').trim();
  if (!companyName) throw new ApiError(400, 'Company name is required.');

  const companyAddress = String(body.companyAddress || '').trim();
  if (!companyAddress) throw new ApiError(400, 'Company address is required.');

  const companyState = String(body.companyState || '').trim();
  if (!INDIAN_STATES.includes(companyState)) {
    throw new ApiError(400, 'Please select a valid state.');
  }

  const companyStateCode = String(body.companyStateCode || '').trim();
  if (!STATE_CODE_REGEX.test(companyStateCode)) {
    throw new ApiError(400, 'State code must be a 2-digit number (e.g. 33).');
  }

  const companyGstNumber = body.companyGstNumber ? String(body.companyGstNumber).trim().toUpperCase() : null;
  if (companyGstNumber && !GST_NUMBER_REGEX.test(companyGstNumber)) {
    throw new ApiError(400, 'Please enter a valid GST number.');
  }

  return { companyName, companyAddress, companyState, companyStateCode, companyGstNumber };
}
