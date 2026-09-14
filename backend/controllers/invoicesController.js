import { getPool, withTransaction } from '../db.js';
import { ApiError } from '../middleware/ApiError.js';
import { validateInvoiceInput } from '../validators/invoices.js';
import { generateNumber } from '../services/numbering.js';
import { computeDocumentTotals } from '../services/calculations.js';
import { resolveStateCode, determineGstType } from '../../shared/gst.js';
import { getCompanyForUser } from './companyController.js';
import { INVOICE_STATUS_OPTIONS } from '../../shared/constants.js';

function mapHeader(row) {
  const cgstAmount = Number(row.cgst_amount);
  const sgstAmount = Number(row.sgst_amount);
  const igstAmount = Number(row.igst_amount);
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    customerId: row.customer_id,
    customerName: row.customer_name,
    salesOrderId: row.sales_order_id,
    soNumber: row.so_number,
    customerAddress: row.customer_address,
    customerGstNumber: row.customer_gst_number,
    customerState: row.customer_state,
    paymentTerms: row.payment_terms,
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
    paidAmount: Number(row.paid_amount),
    balanceAmount: Number(row.balance_amount),
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
    salesOrderItemId: row.sales_order_item_id,
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
  select si.*, c.customer_name, so.so_number
  from sales_invoices si
  join customers c on c.id = si.customer_id
  left join sales_orders so on so.id = si.sales_order_id
`;

export async function list(req, res) {
  const { customerId, status, from, to, invoiceNumber } = req.query;
  const params = [req.user.id];
  const conditions = ['si.user_id = $1'];

  if (customerId) { params.push(customerId); conditions.push(`si.customer_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`si.status = $${params.length}`); }
  if (from) { params.push(from); conditions.push(`si.invoice_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`si.invoice_date <= $${params.length}`); }
  if (invoiceNumber) { params.push(`%${invoiceNumber}%`); conditions.push(`si.invoice_number ilike $${params.length}`); }

  const { rows } = await getPool().query(
    `${HEADER_SELECT} where ${conditions.join(' and ')} order by si.invoice_date desc, si.id desc`,
    params
  );
  res.json({ success: true, data: rows.map(mapHeader) });
}

export async function getById(req, res) {
  const pool = getPool();
  const { rows } = await pool.query(`${HEADER_SELECT} where si.id = $1 and si.user_id = $2`, [req.params.id, req.user.id]);
  if (!rows.length) throw new ApiError(404, 'Invoice not found.');

  const { rows: items } = await pool.query(
    `select sii.*, p.product_code, p.product_name
     from sales_invoice_items sii
     join products p on p.id = sii.product_id
     where sii.sales_invoice_id = $1 order by sii.line_no asc`,
    [req.params.id]
  );

  res.json({ success: true, data: { ...mapHeader(rows[0]), items: items.map(mapItem) } });
}

async function insertItems(client, invoiceId, computedItems) {
  let lineNo = 1;
  for (const item of computedItems) {
    await client.query(
      `insert into sales_invoice_items
        (sales_invoice_id, sales_order_item_id, product_id, line_no, description, hsn_code, uom, quantity, rate, discount_amount, tax_percentage, tax_amount, line_total)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [invoiceId, item.salesOrderItemId, item.productId, lineNo, item.description, item.hsnCode, item.uom, item.quantity, item.rate, item.discountAmount, item.taxPercentage, item.taxAmount, item.lineTotal]
    );
    lineNo += 1;
  }
}

async function assertProductsOwnedByUser(client, items, userId) {
  const productIds = [...new Set(items.map((item) => String(item.productId)))];
  const { rows } = await client.query(
    'select id from products where id = any($1::bigint[]) and user_id = $2',
    [productIds, userId]
  );
  if (rows.length !== productIds.length) {
    throw new ApiError(400, 'One or more products are invalid.');
  }
}

async function resolveGstTypeForCustomer(client, customer, userId) {
  const company = await getCompanyForUser(client, userId);
  const customerStateCode = resolveStateCode({ gstNumber: customer.gst_number, state: customer.state });
  const gstType = determineGstType(company.company_state_code, customerStateCode);
  if (!gstType) {
    throw new ApiError(400, 'Cannot determine GST type. The customer has no usable state or GST information.');
  }
  return gstType;
}

export async function create(req, res) {
  const input = validateInvoiceInput(req.body);

  const header = await withTransaction(async (client) => {
    const { rows: customerRows } = await client.query(
      'select * from customers where id = $1 and user_id = $2 and is_active = true',
      [input.customerId, req.user.id]
    );
    if (!customerRows.length) throw new ApiError(400, 'Please select a valid active customer.');
    const customer = customerRows[0];

    await assertProductsOwnedByUser(client, input.items, req.user.id);

    const gstType = await resolveGstTypeForCustomer(client, customer, req.user.id);
    const { computedItems, subtotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal } =
      computeDocumentTotals(input.items, gstType);

    let soNumber = null;
    if (input.salesOrderId) {
      const { rows: soRows } = await client.query(
        'select so_number from sales_orders where id = $1 and user_id = $2',
        [input.salesOrderId, req.user.id]
      );
      if (!soRows.length) throw new ApiError(400, 'Referenced sales order not found.');
      soNumber = soRows[0].so_number;
    }

    const invoiceNumber = await generateNumber(client, req.user.id, 'INV', { yearly: true });

    const { rows } = await client.query(
      `insert into sales_invoices
        (invoice_number, invoice_date, customer_id, sales_order_id, customer_address, customer_gst_number, customer_state,
         payment_terms, remarks, subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_gst,
         round_off, tax_amount, grand_total, balance_amount, user_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$16,$18,$18,$19)
       returning *`,
      [invoiceNumber, input.invoiceDate, input.customerId, input.salesOrderId, customer.address, customer.gst_number, customer.state,
        input.paymentTerms, input.remarks, subtotal, discountAmount, taxableAmount,
        cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal, req.user.id]
    );
    const invoice = rows[0];

    await insertItems(client, invoice.id, computedItems);

    return { ...invoice, customer_name: customer.customer_name, so_number: soNumber };
  });

  res.status(201).json({ success: true, data: mapHeader(header) });
}

export async function update(req, res) {
  const input = validateInvoiceInput(req.body);

  const header = await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      'select * from sales_invoices where id = $1 and user_id = $2 for update',
      [req.params.id, req.user.id]
    );
    if (!existingRows.length) throw new ApiError(404, 'Invoice not found.');
    const existing = existingRows[0];
    if (existing.status !== 'Draft') {
      throw new ApiError(400, 'Only invoices in Draft status can be edited.');
    }

    const { rows: customerRows } = await client.query(
      'select * from customers where id = $1 and user_id = $2 and is_active = true',
      [input.customerId, req.user.id]
    );
    if (!customerRows.length) throw new ApiError(400, 'Please select a valid active customer.');
    const customer = customerRows[0];

    await assertProductsOwnedByUser(client, input.items, req.user.id);

    const gstType = await resolveGstTypeForCustomer(client, customer, req.user.id);
    const { computedItems, subtotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal } =
      computeDocumentTotals(input.items, gstType);

    let soNumber = null;
    if (input.salesOrderId) {
      const { rows: soRows } = await client.query(
        'select so_number from sales_orders where id = $1 and user_id = $2',
        [input.salesOrderId, req.user.id]
      );
      if (!soRows.length) throw new ApiError(400, 'Referenced sales order not found.');
      soNumber = soRows[0].so_number;
    }

    const { rows } = await client.query(
      `update sales_invoices set
         invoice_date=$1, customer_id=$2, sales_order_id=$3, customer_address=$4, customer_gst_number=$5, customer_state=$6,
         payment_terms=$7, remarks=$8, subtotal=$9, discount_amount=$10, taxable_amount=$11,
         cgst_amount=$12, sgst_amount=$13, igst_amount=$14, total_gst=$15, round_off=$16, tax_amount=$15,
         grand_total=$17, balance_amount=$17
       where id=$18 and user_id=$19 returning *`,
      [input.invoiceDate, input.customerId, input.salesOrderId, customer.address, customer.gst_number, customer.state,
        input.paymentTerms, input.remarks, subtotal, discountAmount, taxableAmount,
        cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal, req.params.id, req.user.id]
    );

    await client.query('delete from sales_invoice_items where sales_invoice_id = $1', [req.params.id]);
    await insertItems(client, req.params.id, computedItems);

    return { ...rows[0], customer_name: customer.customer_name, so_number: soNumber };
  });

  res.json({ success: true, data: mapHeader(header) });
}

export async function updateStatus(req, res) {
  const { status } = req.body;
  if (!INVOICE_STATUS_OPTIONS.includes(status)) {
    throw new ApiError(400, 'Please provide a valid status.');
  }

  const header = await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      'select * from sales_invoices where id = $1 and user_id = $2 for update',
      [req.params.id, req.user.id]
    );
    if (!existingRows.length) throw new ApiError(404, 'Invoice not found.');
    const existing = existingRows[0];

    if (existing.status === 'Cancelled') {
      throw new ApiError(400, 'Cancelled invoices cannot be changed.');
    }
    if (status === 'Cancelled' && Number(existing.paid_amount) > 0) {
      throw new ApiError(400, 'Cannot cancel an invoice that has payments recorded against it.');
    }
    if (['Partially Paid', 'Paid'].includes(status)) {
      throw new ApiError(400, 'Payment status is updated automatically when a payment is recorded, not set manually.');
    }

    const { rows } = await client.query(
      'update sales_invoices set status = $1 where id = $2 and user_id = $3 returning *',
      [status, req.params.id, req.user.id]
    );
    const { rows: customerRows } = await client.query(
      'select customer_name from customers where id = $1',
      [rows[0].customer_id]
    );

    return { ...rows[0], customer_name: customerRows[0]?.customer_name, so_number: null };
  });

  res.json({ success: true, data: mapHeader(header) });
}

export async function remove(req, res) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      'select * from sales_invoices where id = $1 and user_id = $2 for update',
      [req.params.id, req.user.id]
    );
    if (!rows.length) throw new ApiError(404, 'Invoice not found.');
    const invoice = rows[0];
    if (invoice.status !== 'Draft' || Number(invoice.paid_amount) > 0) {
      throw new ApiError(400, 'Only draft invoices with no payments can be deleted.');
    }
    await client.query('delete from sales_invoices where id = $1', [req.params.id]);
  });

  res.json({ success: true, data: null });
}
