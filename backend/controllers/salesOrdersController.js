import { getPool, withTransaction } from '../db.js';
import { ApiError } from '../middleware/ApiError.js';
import { validateSalesOrderInput } from '../validators/salesOrders.js';
import { generateNumber } from '../services/numbering.js';
import { computeDocumentTotals } from '../services/calculations.js';
import { resolveStateCode, determineGstType } from '../../shared/gst.js';
import { resolveCompanyStateCode } from './companyController.js';
import { SALES_ORDER_STATUS_OPTIONS } from '../../shared/constants.js';

function mapHeader(row) {
  const cgstAmount = Number(row.cgst_amount);
  const sgstAmount = Number(row.sgst_amount);
  const igstAmount = Number(row.igst_amount);
  return {
    id: row.id,
    soNumber: row.so_number,
    soDate: row.so_date,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerGstNumber: row.customer_gst_number,
    customerState: row.customer_state,
    paymentTerms: row.payment_terms,
    deliveryDate: row.delivery_date,
    remarks: row.remarks,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    taxableAmount: Number(row.taxable_amount),
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGst: Number(row.total_gst),
    roundOff: Number(row.round_off),
    gstType: igstAmount > 0 ? 'INTER' : (cgstAmount > 0 || sgstAmount > 0 ? 'INTRA' : null),
    taxAmount: Number(row.tax_amount),
    grandTotal: Number(row.grand_total),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productCode: row.product_code,
    productName: row.product_name,
    lineNo: row.line_no,
    description: row.description,
    hsnCode: row.hsn_code,
    uom: row.uom,
    quantity: Number(row.quantity),
    rate: Number(row.rate),
    discountAmount: Number(row.discount_amount),
    taxPercentage: Number(row.tax_percentage),
    taxAmount: Number(row.tax_amount),
    lineTotal: Number(row.line_total),
  };
}

const HEADER_SELECT = `
  select so.*, c.customer_name
  from sales_orders so
  join customers c on c.id = so.customer_id
`;

export async function list(req, res) {
  const { customerId, status, from, to, soNumber } = req.query;
  const conditions = [];
  const params = [];

  if (customerId) { params.push(customerId); conditions.push(`so.customer_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`so.status = $${params.length}`); }
  if (from) { params.push(from); conditions.push(`so.so_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`so.so_date <= $${params.length}`); }
  if (soNumber) { params.push(`%${soNumber}%`); conditions.push(`so.so_number ilike $${params.length}`); }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await getPool().query(
    `${HEADER_SELECT} ${where} order by so.so_date desc, so.id desc`,
    params
  );
  res.json({ success: true, data: rows.map(mapHeader) });
}

export async function getById(req, res) {
  const pool = getPool();
  const { rows } = await pool.query(`${HEADER_SELECT} where so.id = $1`, [req.params.id]);
  if (!rows.length) throw new ApiError(404, 'Sales order not found.');

  const { rows: items } = await pool.query(
    `select soi.*, p.product_code, p.product_name
     from sales_order_items soi
     join products p on p.id = soi.product_id
     where soi.sales_order_id = $1 order by soi.line_no asc`,
    [req.params.id]
  );

  res.json({ success: true, data: { ...mapHeader(rows[0]), items: items.map(mapItem) } });
}

async function insertItems(client, salesOrderId, computedItems) {
  let lineNo = 1;
  for (const item of computedItems) {
    await client.query(
      `insert into sales_order_items
        (sales_order_id, product_id, line_no, description, hsn_code, uom, quantity, rate, discount_amount, tax_percentage, tax_amount, line_total)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [salesOrderId, item.productId, lineNo, item.description, item.hsnCode, item.uom, item.quantity, item.rate, item.discountAmount, item.taxPercentage, item.taxAmount, item.lineTotal]
    );
    lineNo += 1;
  }
}

// For a Sales Order/Invoice, OUR COMPANY is the GST seller and the CUSTOMER
// is the buyer — the reverse of a Purchase Order.
function resolveGstTypeForCustomer(customer) {
  const customerStateCode = resolveStateCode({ gstNumber: customer.gst_number, state: customer.state });
  const companyStateCode = resolveCompanyStateCode();
  const gstType = determineGstType(companyStateCode, customerStateCode);
  if (!gstType) {
    throw new ApiError(
      400,
      'Cannot determine GST type. Please configure COMPANY_STATE_CODE (or COMPANY_GST_NUMBER / COMPANY_STATE) in the environment, and ensure the customer has a valid state or GST number.'
    );
  }
  return gstType;
}

export async function create(req, res) {
  const input = validateSalesOrderInput(req.body);

  const header = await withTransaction(async (client) => {
    const { rows: customerRows } = await client.query(
      'select * from customers where id = $1 and is_active = true',
      [input.customerId]
    );
    if (!customerRows.length) throw new ApiError(400, 'Please select a valid active customer.');
    const customer = customerRows[0];

    const gstType = resolveGstTypeForCustomer(customer);
    const { computedItems, subtotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal } =
      computeDocumentTotals(input.items, gstType);

    const soNumber = await generateNumber(client, 'SO', { yearly: true });

    const { rows } = await client.query(
      `insert into sales_orders
        (so_number, so_date, customer_id, customer_gst_number, customer_state, payment_terms, delivery_date, remarks,
         subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_gst, round_off, tax_amount, grand_total)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$15,$17)
       returning *`,
      [soNumber, input.soDate, input.customerId, customer.gst_number, customer.state, input.paymentTerms,
        input.deliveryDate, input.remarks, subtotal, discountAmount, taxableAmount,
        cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal]
    );
    const so = rows[0];

    await insertItems(client, so.id, computedItems);

    return { ...so, customer_name: customer.customer_name };
  });

  res.status(201).json({ success: true, data: mapHeader(header) });
}

export async function update(req, res) {
  const input = validateSalesOrderInput(req.body);

  const header = await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      'select * from sales_orders where id = $1 for update',
      [req.params.id]
    );
    if (!existingRows.length) throw new ApiError(404, 'Sales order not found.');
    const existing = existingRows[0];
    if (existing.status !== 'Draft') {
      throw new ApiError(400, 'Only sales orders in Draft status can be edited.');
    }

    const { rows: customerRows } = await client.query(
      'select * from customers where id = $1 and is_active = true',
      [input.customerId]
    );
    if (!customerRows.length) throw new ApiError(400, 'Please select a valid active customer.');
    const customer = customerRows[0];

    const gstType = resolveGstTypeForCustomer(customer);
    const { computedItems, subtotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal } =
      computeDocumentTotals(input.items, gstType);

    const { rows } = await client.query(
      `update sales_orders set
         so_date=$1, customer_id=$2, customer_gst_number=$3, customer_state=$4, payment_terms=$5,
         delivery_date=$6, remarks=$7, subtotal=$8, discount_amount=$9, taxable_amount=$10,
         cgst_amount=$11, sgst_amount=$12, igst_amount=$13, total_gst=$14, round_off=$15, tax_amount=$14,
         grand_total=$16
       where id=$17 returning *`,
      [input.soDate, input.customerId, customer.gst_number, customer.state, input.paymentTerms,
        input.deliveryDate, input.remarks, subtotal, discountAmount, taxableAmount,
        cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal, req.params.id]
    );

    await client.query('delete from sales_order_items where sales_order_id = $1', [req.params.id]);
    await insertItems(client, req.params.id, computedItems);

    return { ...rows[0], customer_name: customer.customer_name };
  });

  res.json({ success: true, data: mapHeader(header) });
}

export async function updateStatus(req, res) {
  const { status } = req.body;
  if (!SALES_ORDER_STATUS_OPTIONS.includes(status)) {
    throw new ApiError(400, 'Please provide a valid status.');
  }

  const header = await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      'select * from sales_orders where id = $1 for update',
      [req.params.id]
    );
    if (!existingRows.length) throw new ApiError(404, 'Sales order not found.');
    const existing = existingRows[0];

    if (existing.status === 'Cancelled') {
      throw new ApiError(400, 'Cancelled sales orders cannot be changed.');
    }

    const { rows } = await client.query(
      'update sales_orders set status = $1 where id = $2 returning *',
      [status, req.params.id]
    );
    const { rows: customerRows } = await client.query(
      'select customer_name from customers where id = $1',
      [rows[0].customer_id]
    );

    return { ...rows[0], customer_name: customerRows[0]?.customer_name };
  });

  res.json({ success: true, data: mapHeader(header) });
}

export async function remove(req, res) {
  await withTransaction(async (client) => {
    const { rows } = await client.query('select * from sales_orders where id = $1 for update', [req.params.id]);
    if (!rows.length) throw new ApiError(404, 'Sales order not found.');
    if (rows[0].status !== 'Draft') {
      throw new ApiError(400, 'Only draft sales orders can be deleted.');
    }
    await client.query('delete from sales_orders where id = $1', [req.params.id]);
  });

  res.json({ success: true, data: null });
}
