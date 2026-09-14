import { getPool, withTransaction } from '../db.js';
import { ApiError } from '../middleware/ApiError.js';
import { validatePartyInput } from '../validators/party.js';
import { generateNumber } from '../services/numbering.js';

function mapRow(row) {
  return {
    id: row.id,
    supplierCode: row.supplier_code,
    name: row.supplier_name,
    address: row.address,
    state: row.state,
    city: row.city,
    pincode: row.pincode,
    gstNumber: row.gst_number,
    phone: row.phone,
    email: row.email,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function list(req, res) {
  const { search, active } = req.query;
  const params = [req.user.id];
  const conditions = ['user_id = $1'];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(supplier_name ilike $${params.length} or supplier_code ilike $${params.length})`);
  }
  if (active === 'true' || active === 'false') {
    params.push(active === 'true');
    conditions.push(`is_active = $${params.length}`);
  }

  const { rows } = await getPool().query(
    `select * from suppliers where ${conditions.join(' and ')} order by supplier_name asc`,
    params
  );
  res.json({ success: true, data: rows.map(mapRow) });
}

export async function getById(req, res) {
  const { rows } = await getPool().query(
    'select * from suppliers where id = $1 and user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows.length) throw new ApiError(404, 'Supplier not found.');
  res.json({ success: true, data: mapRow(rows[0]) });
}

export async function create(req, res) {
  const input = validatePartyInput(req.body);

  const row = await withTransaction(async (client) => {
    const supplierCode = await generateNumber(client, req.user.id, 'SUP');
    const { rows } = await client.query(
      `insert into suppliers (supplier_code, supplier_name, address, state, city, pincode, gst_number, phone, email, user_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [supplierCode, input.name, input.address, input.state, input.city, input.pincode, input.gstNumber, input.phone, input.email, req.user.id]
    );
    return rows[0];
  });

  res.status(201).json({ success: true, data: mapRow(row) });
}

export async function update(req, res) {
  const input = validatePartyInput(req.body);

  const { rows } = await getPool().query(
    `update suppliers set
       supplier_name=$1, address=$2, state=$3, city=$4, pincode=$5, gst_number=$6, phone=$7, email=$8
     where id=$9 and user_id=$10 returning *`,
    [input.name, input.address, input.state, input.city, input.pincode, input.gstNumber, input.phone, input.email, req.params.id, req.user.id]
  );
  if (!rows.length) throw new ApiError(404, 'Supplier not found.');
  res.json({ success: true, data: mapRow(rows[0]) });
}

export async function deactivate(req, res) {
  const { rows } = await getPool().query(
    'update suppliers set is_active = false where id = $1 and user_id = $2 returning *',
    [req.params.id, req.user.id]
  );
  if (!rows.length) throw new ApiError(404, 'Supplier not found.');
  res.json({ success: true, data: mapRow(rows[0]) });
}
