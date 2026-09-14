import { getPool } from '../db.js';
import { ApiError } from '../middleware/ApiError.js';
import { validateCompanyUpdateInput } from '../validators/auth.js';

function mapRow(row) {
  return {
    id: row.id,
    companyName: row.company_name,
    companyAddress: row.company_address,
    companyGstNumber: row.company_gst_number,
    companyState: row.company_state,
    companyStateCode: row.company_state_code,
    // Kept for backward compatibility with existing frontend code that
    // reads company.name/state/stateCode/gstNumber/address.
    name: row.company_name,
    address: row.company_address,
    gstNumber: row.company_gst_number,
    state: row.company_state,
    stateCode: row.company_state_code,
  };
}

// Every authenticated user has exactly one company row (enforced by
// UNIQUE(user_id) at the database level). Looked up fresh on every request
// from the verified req.user.id — never from a client-supplied id.
export async function getInfo(req, res) {
  const { rows } = await getPool().query('select * from companies where user_id = $1', [req.user.id]);
  if (!rows.length) throw new ApiError(404, 'Company profile not found.');
  res.json({ success: true, data: mapRow(rows[0]) });
}

export async function updateInfo(req, res) {
  const input = validateCompanyUpdateInput(req.body);

  const { rows } = await getPool().query(
    `update companies set
       company_name = $1, company_address = $2, company_gst_number = $3,
       company_state = $4, company_state_code = $5
     where user_id = $6
     returning *`,
    [input.companyName, input.companyAddress, input.companyGstNumber, input.companyState, input.companyStateCode, req.user.id]
  );
  if (!rows.length) throw new ApiError(404, 'Company profile not found.');
  res.json({ success: true, data: mapRow(rows[0]) });
}

// Fetches the authenticated user's company row for internal use by other
// controllers (invoice/order GST calculation, numbering, etc.) — not an
// HTTP handler itself.
export async function getCompanyForUser(client, userId) {
  const { rows } = await client.query('select * from companies where user_id = $1', [userId]);
  if (!rows.length) {
    throw new ApiError(400, 'Company profile not found for the current user. Please complete Company Settings first.');
  }
  return rows[0];
}
