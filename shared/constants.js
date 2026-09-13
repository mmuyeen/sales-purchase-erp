// Single source of truth for hard-coded dropdown/config values.
// Imported directly by both the backend (Node/Express) and the frontend (Vite/React).
// Per project decision: UOM, Tax, Payment Terms, Payment Modes and Indian States
// are hard-coded here and do NOT have database master tables.

export const UOM_OPTIONS = [
  'PCS',
  'NOS',
  'BOX',
  'KG',
  'GRAM',
  'LTR',
  'MTR',
  'SET',
  'DOZEN',
];

export const TAX_RATE_OPTIONS = [0, 5, 12, 18, 28];

export const PAYMENT_TERM_OPTIONS = [
  'Cash',
  'Immediate',
  '7 Days',
  '15 Days',
  '30 Days',
  '45 Days',
  '60 Days',
  '90 Days',
];

export const PAYMENT_MODE_OPTIONS = [
  'Cash',
  'Bank Transfer',
  'UPI',
  'Cheque',
  'Card',
  'Other',
];

export const PURCHASE_ORDER_STATUS_OPTIONS = [
  'Draft',
  'Confirmed',
  'Partially Received',
  'Completed',
  'Cancelled',
];

export const SALES_ORDER_STATUS_OPTIONS = [
  'Draft',
  'Confirmed',
  'Partially Invoiced',
  'Completed',
  'Cancelled',
];

export const INVOICE_STATUS_OPTIONS = [
  'Draft',
  'Issued',
  'Partially Paid',
  'Paid',
  'Cancelled',
];

export const PAYMENT_STATUS_OPTIONS = ['Unpaid', 'Partially Paid', 'Paid'];

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export const GST_NUMBER_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

// HSN Code: digits only, 4, 6, or 8 digits (leading zeros are significant and
// must be preserved, which is why this is validated as text, not parsed as a number).
export const HSN_CODE_REGEX = /^([0-9]{4}|[0-9]{6}|[0-9]{8})$/;

// Official GST state codes (the first two digits of any GSTIN), keyed by the
// exact state names used in INDIAN_STATES above. Used to determine
// intra-state vs inter-state GST (CGST+SGST vs IGST) without a state master
// table, per project decision.
export const INDIAN_STATE_CODES = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  'Punjab': '03',
  'Chandigarh': '04',
  'Uttarakhand': '05',
  'Haryana': '06',
  'Delhi': '07',
  'Rajasthan': '08',
  'Uttar Pradesh': '09',
  'Bihar': '10',
  'Sikkim': '11',
  'Arunachal Pradesh': '12',
  'Nagaland': '13',
  'Manipur': '14',
  'Mizoram': '15',
  'Tripura': '16',
  'Meghalaya': '17',
  'Assam': '18',
  'West Bengal': '19',
  'Jharkhand': '20',
  'Odisha': '21',
  'Chhattisgarh': '22',
  'Madhya Pradesh': '23',
  'Gujarat': '24',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  'Maharashtra': '27',
  'Karnataka': '29',
  'Goa': '30',
  'Lakshadweep': '31',
  'Kerala': '32',
  'Tamil Nadu': '33',
  'Puducherry': '34',
  'Andaman and Nicobar Islands': '35',
  'Telangana': '36',
  'Andhra Pradesh': '37',
  'Ladakh': '38',
};

// Default printable-invoice terms & conditions. A single configurable source
// so the invoice print view never hard-codes this text inline; edit here to
// change what appears on every printed invoice.
export const DEFAULT_INVOICE_TERMS = [
  { text: 'Our responsibility ceases as soon as goods leaves our premises', bold: false },
  { text: 'Please return the duplicate copy duly signed.', bold: false },
  { text: 'Computerised generated invoice signature not required.', bold: true },
];
