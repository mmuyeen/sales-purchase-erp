import { INDIAN_STATE_CODES } from './constants.js';

// Looks up a state's GST code by its exact name (as used in INDIAN_STATES).
export function getStateCodeByName(stateName) {
  return INDIAN_STATE_CODES[stateName] || null;
}

// Resolves a party's (customer/supplier/company) GST state code, preferring
// the first two digits of their GSTIN when one is present and valid, and
// falling back to a state-name lookup otherwise. Returns null if neither
// source yields a usable code, so callers can fail safely rather than guess.
export function resolveStateCode({ gstNumber, state }) {
  if (gstNumber && typeof gstNumber === 'string') {
    const prefix = gstNumber.trim().slice(0, 2);
    if (/^[0-9]{2}$/.test(prefix)) {
      return prefix;
    }
  }
  return getStateCodeByName(state);
}

// Compares seller and buyer state codes to classify a transaction.
// Returns null (rather than guessing) if either code is missing.
export function determineGstType(sellerStateCode, buyerStateCode) {
  if (!sellerStateCode || !buyerStateCode) return null;
  return sellerStateCode === buyerStateCode ? 'INTRA' : 'INTER';
}
