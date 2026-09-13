import { getPool, withTransaction } from '../db.js';
import { ApiError } from '../middleware/ApiError.js';
import { validateProductInput } from '../validators/products.js';
import { generateNumber } from '../services/numbering.js';

function mapRow(row) {
  return {
    id: row.id,
    productCode: row.product_code,
    name: row.product_name,
    description: row.description,
    hsnCode: row.hsn_code,
    uom: row.uom,
    taxPercentage: Number(row.tax_percentage),
    paymentTerm: row.payment_term,
    purchasePrice: Number(row.purchase_price),
    salesPrice: Number(row.sales_price),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function list(req, res) {
  const { search, active } = req.query;
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(product_name ilike $${params.length} or product_code ilike $${params.length})`);
  }
  if (active === 'true' || active === 'false') {
    params.push(active === 'true');
    conditions.push(`is_active = $${params.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await getPool().query(
    `select * from products ${where} order by product_name asc`,
    params
  );
  res.json({ success: true, data: rows.map(mapRow) });
}

export async function getById(req, res) {
  const { rows } = await getPool().query('select * from products where id = $1', [req.params.id]);
  if (!rows.length) throw new ApiError(404, 'Product not found.');
  res.json({ success: true, data: mapRow(rows[0]) });
}

export async function create(req, res) {
  const input = validateProductInput(req.body);

  const row = await withTransaction(async (client) => {
    const productCode = await generateNumber(client, 'PROD');
    const { rows } = await client.query(
      `insert into products (product_code, product_name, description, hsn_code, uom, tax_percentage, payment_term, purchase_price, sales_price)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [productCode, input.name, input.description, input.hsnCode, input.uom, input.taxPercentage, input.paymentTerm, input.purchasePrice, input.salesPrice]
    );
    return rows[0];
  });

  res.status(201).json({ success: true, data: mapRow(row) });
}

export async function update(req, res) {
  const input = validateProductInput(req.body);

  const { rows } = await getPool().query(
    `update products set
       product_name=$1, description=$2, hsn_code=$3, uom=$4, tax_percentage=$5, payment_term=$6, purchase_price=$7, sales_price=$8
     where id=$9 returning *`,
    [input.name, input.description, input.hsnCode, input.uom, input.taxPercentage, input.paymentTerm, input.purchasePrice, input.salesPrice, req.params.id]
  );
  if (!rows.length) throw new ApiError(404, 'Product not found.');
  res.json({ success: true, data: mapRow(rows[0]) });
}

export async function deactivate(req, res) {
  const { rows } = await getPool().query(
    'update products set is_active = false where id = $1 returning *',
    [req.params.id]
  );
  if (!rows.length) throw new ApiError(404, 'Product not found.');
  res.json({ success: true, data: mapRow(rows[0]) });
}
