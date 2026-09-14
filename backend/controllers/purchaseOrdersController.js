import { getPool, withTransaction } from '../db.js';
import { ApiError } from '../middleware/ApiError.js';
import { validatePurchaseOrderInput } from '../validators/purchaseOrders.js';
import { generateNumber } from '../services/numbering.js';
import { computeDocumentTotals } from '../services/calculations.js';
import { resolveStateCode, determineGstType } from '../../shared/gst.js';
import { getCompanyForUser } from './companyController.js';
import { PURCHASE_ORDER_STATUS_OPTIONS } from '../../shared/constants.js';

function mapHeader(row) {
  const cgstAmount = Number(row.cgst_amount);
  const sgstAmount = Number(row.sgst_amount);
  const igstAmount = Number(row.igst_amount);
  return {
    id: row.id,
    poNumber: row.po_number,
    poDate: row.po_date,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierGstNumber: row.supplier_gst_number,
    supplierState: row.supplier_state,
    paymentTerms: row.payment_terms,
    expectedDeliveryDate: row.expected_delivery_date,
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
    paymentStatus: row.payment_status,
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
  select po.*, s.supplier_name
  from purchase_orders po
  join suppliers s on s.id = po.supplier_id
`;

export async function list(req, res) {
  const { supplierId, status, from, to, poNumber } = req.query;
  const params = [req.user.id];
  const conditions = ['po.user_id = $1'];

  if (supplierId) { params.push(supplierId); conditions.push(`po.supplier_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`po.status = $${params.length}`); }
  if (from) { params.push(from); conditions.push(`po.po_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`po.po_date <= $${params.length}`); }
  if (poNumber) { params.push(`%${poNumber}%`); conditions.push(`po.po_number ilike $${params.length}`); }

  const { rows } = await getPool().query(
    `${HEADER_SELECT} where ${conditions.join(' and ')} order by po.po_date desc, po.id desc`,
    params
  );
  res.json({ success: true, data: rows.map(mapHeader) });
}

export async function getById(req, res) {
  const pool = getPool();
  const { rows } = await pool.query(`${HEADER_SELECT} where po.id = $1 and po.user_id = $2`, [req.params.id, req.user.id]);
  if (!rows.length) throw new ApiError(404, 'Purchase order not found.');

  const { rows: items } = await pool.query(
    `select poi.*, p.product_code, p.product_name
     from purchase_order_items poi
     join products p on p.id = poi.product_id
     where poi.purchase_order_id = $1 order by poi.line_no asc`,
    [req.params.id]
  );

  res.json({ success: true, data: { ...mapHeader(rows[0]), items: items.map(mapItem) } });
}

async function insertItems(client, purchaseOrderId, computedItems) {
  let lineNo = 1;
  for (const item of computedItems) {
    await client.query(
      `insert into purchase_order_items
        (purchase_order_id, product_id, line_no, description, hsn_code, uom, quantity, rate, discount_amount, tax_percentage, tax_amount, line_total)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [purchaseOrderId, item.productId, lineNo, item.description, item.hsnCode, item.uom, item.quantity, item.rate, item.discountAmount, item.taxPercentage, item.taxAmount, item.lineTotal]
    );
    lineNo += 1;
  }
}

// Never trust a product id from the client — confirm every one referenced
// by this order actually belongs to the authenticated tenant. Without this,
// Vendor A could reference Vendor B's real product id and it would pass
// (the DB foreign key only checks existence, not ownership).
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

// Purchase Order: the SUPPLIER is the GST seller, OUR COMPANY is the buyer —
// the reverse of a Sales Invoice/Order. Seller/buyer state now comes from
// the authenticated user's own company row, never from env vars or another
// tenant's data.
async function resolveGstTypeForSupplier(client, supplier, userId) {
  const company = await getCompanyForUser(client, userId);
  const supplierStateCode = resolveStateCode({ gstNumber: supplier.gst_number, state: supplier.state });
  const gstType = determineGstType(supplierStateCode, company.company_state_code);
  if (!gstType) {
    throw new ApiError(400, 'Cannot determine GST type. The supplier has no usable state or GST information.');
  }
  return gstType;
}

export async function create(req, res) {
  const input = validatePurchaseOrderInput(req.body);

  const header = await withTransaction(async (client) => {
    const { rows: supplierRows } = await client.query(
      'select * from suppliers where id = $1 and user_id = $2 and is_active = true',
      [input.supplierId, req.user.id]
    );
    if (!supplierRows.length) throw new ApiError(400, 'Please select a valid active supplier.');
    const supplier = supplierRows[0];

    await assertProductsOwnedByUser(client, input.items, req.user.id);

    const gstType = await resolveGstTypeForSupplier(client, supplier, req.user.id);
    const { computedItems, subtotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal } =
      computeDocumentTotals(input.items, gstType);

    const poNumber = await generateNumber(client, req.user.id, 'PO', { yearly: true });

    const { rows } = await client.query(
      `insert into purchase_orders
        (po_number, po_date, supplier_id, supplier_gst_number, supplier_state, payment_terms, expected_delivery_date, remarks,
         subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_gst, round_off, tax_amount,
         grand_total, balance_amount, user_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$15,$17,$17,$18)
       returning *`,
      [poNumber, input.poDate, input.supplierId, supplier.gst_number, supplier.state, input.paymentTerms,
        input.expectedDeliveryDate, input.remarks, subtotal, discountAmount, taxableAmount,
        cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal, req.user.id]
    );
    const po = rows[0];

    await insertItems(client, po.id, computedItems);

    return { ...po, supplier_name: supplier.supplier_name };
  });

  res.status(201).json({ success: true, data: mapHeader(header) });
}

export async function update(req, res) {
  const input = validatePurchaseOrderInput(req.body);

  const header = await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      'select * from purchase_orders where id = $1 and user_id = $2 for update',
      [req.params.id, req.user.id]
    );
    if (!existingRows.length) throw new ApiError(404, 'Purchase order not found.');
    const existing = existingRows[0];
    if (existing.status !== 'Draft') {
      throw new ApiError(400, 'Only purchase orders in Draft status can be edited.');
    }

    const { rows: supplierRows } = await client.query(
      'select * from suppliers where id = $1 and user_id = $2 and is_active = true',
      [input.supplierId, req.user.id]
    );
    if (!supplierRows.length) throw new ApiError(400, 'Please select a valid active supplier.');
    const supplier = supplierRows[0];

    await assertProductsOwnedByUser(client, input.items, req.user.id);

    const gstType = await resolveGstTypeForSupplier(client, supplier, req.user.id);
    const { computedItems, subtotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal } =
      computeDocumentTotals(input.items, gstType);

    const balanceAmount = grandTotal - Number(existing.paid_amount);
    if (balanceAmount < 0) {
      throw new ApiError(400, 'Grand total cannot be less than the amount already paid.');
    }

    const { rows } = await client.query(
      `update purchase_orders set
         po_date=$1, supplier_id=$2, supplier_gst_number=$3, supplier_state=$4, payment_terms=$5,
         expected_delivery_date=$6, remarks=$7, subtotal=$8, discount_amount=$9, taxable_amount=$10,
         cgst_amount=$11, sgst_amount=$12, igst_amount=$13, total_gst=$14, round_off=$15, tax_amount=$14,
         grand_total=$16, balance_amount=$17
       where id=$18 and user_id=$19 returning *`,
      [input.poDate, input.supplierId, supplier.gst_number, supplier.state, input.paymentTerms,
        input.expectedDeliveryDate, input.remarks, subtotal, discountAmount, taxableAmount,
        cgstAmount, sgstAmount, igstAmount, totalGst, roundOff, grandTotal, balanceAmount, req.params.id, req.user.id]
    );

    await client.query('delete from purchase_order_items where purchase_order_id = $1', [req.params.id]);
    await insertItems(client, req.params.id, computedItems);

    return { ...rows[0], supplier_name: supplier.supplier_name };
  });

  res.json({ success: true, data: mapHeader(header) });
}

export async function updateStatus(req, res) {
  const { status } = req.body;
  if (!PURCHASE_ORDER_STATUS_OPTIONS.includes(status)) {
    throw new ApiError(400, 'Please provide a valid status.');
  }

  const header = await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      'select * from purchase_orders where id = $1 and user_id = $2 for update',
      [req.params.id, req.user.id]
    );
    if (!existingRows.length) throw new ApiError(404, 'Purchase order not found.');
    const existing = existingRows[0];

    if (existing.status === 'Cancelled') {
      throw new ApiError(400, 'Cancelled purchase orders cannot be changed.');
    }
    if (status === 'Cancelled' && Number(existing.paid_amount) > 0) {
      throw new ApiError(400, 'Cannot cancel a purchase order that has payments recorded against it.');
    }

    const { rows } = await client.query(
      'update purchase_orders set status = $1 where id = $2 and user_id = $3 returning *',
      [status, req.params.id, req.user.id]
    );
    const { rows: supplierRows } = await client.query(
      'select supplier_name from suppliers where id = $1',
      [rows[0].supplier_id]
    );

    return { ...rows[0], supplier_name: supplierRows[0]?.supplier_name };
  });

  res.json({ success: true, data: mapHeader(header) });
}

export async function remove(req, res) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      'select * from purchase_orders where id = $1 and user_id = $2 for update',
      [req.params.id, req.user.id]
    );
    if (!rows.length) throw new ApiError(404, 'Purchase order not found.');
    const po = rows[0];
    if (po.status !== 'Draft' || Number(po.paid_amount) > 0) {
      throw new ApiError(400, 'Only draft purchase orders with no payments can be deleted.');
    }
    await client.query('delete from purchase_orders where id = $1', [req.params.id]);
  });

  res.json({ success: true, data: null });
}
