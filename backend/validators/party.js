// Shared by Customer and Supplier controllers — both masters have an identical shape.
import {
  requireString,
  validatePincode,
  validateState,
  validateGstNumber,
  validateEmail,
  validatePhone,
} from './common.js';

export function validatePartyInput(body) {
  const name = requireString(body.name, 'Name');
  const state = requireString(body.state, 'State');
  validateState(state);
  const city = requireString(body.city, 'City');
  const pincode = requireString(body.pincode, 'Pincode');
  validatePincode(pincode);

  const gstNumber = body.gstNumber ? String(body.gstNumber).trim().toUpperCase() : null;
  validateGstNumber(gstNumber);

  const email = body.email ? String(body.email).trim() : null;
  validateEmail(email);

  const phone = body.phone ? String(body.phone).trim() : null;
  validatePhone(phone);

  const address = body.address ? String(body.address).trim() : null;

  return { name, address, state, city, pincode, gstNumber, phone, email };
}
