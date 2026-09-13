import { resolveStateCode } from '../../shared/gst.js';

// Resolves the company's GST state code with this priority:
//   1. an explicit COMPANY_STATE_CODE env var (highest priority — always wins if set)
//   2. the first two digits of COMPANY_GST_NUMBER
//   3. a lookup of COMPANY_STATE's name against the hard-coded Indian states list
// Returns null (never a hardcoded guess) if none of these resolve.
export function resolveCompanyStateCode() {
  if (process.env.COMPANY_STATE_CODE) {
    return process.env.COMPANY_STATE_CODE.trim();
  }
  return resolveStateCode({
    gstNumber: process.env.COMPANY_GST_NUMBER,
    state: process.env.COMPANY_STATE,
  });
}

export async function getInfo(req, res) {
  res.json({
    success: true,
    data: {
      name: process.env.COMPANY_NAME || '',
      address: process.env.COMPANY_ADDRESS || '',
      gstNumber: process.env.COMPANY_GST_NUMBER || '',
      state: process.env.COMPANY_STATE || '',
      stateCode: resolveCompanyStateCode(),
    },
  });
}
