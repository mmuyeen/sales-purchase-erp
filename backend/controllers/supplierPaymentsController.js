import { getPool, withTransaction } from '../db.js';
import { ApiError } from '../middleware/ApiError.js';
import { generateNumber } from '../services/numbering.js';
import { round2 } from '../services/calculations.js';
import { PAYMENT_MODE_OPTIONS } from '../../shared/constants.js';

function mapRow(row) {
  return {
    id: row.id,
    paymentNumber: row.payment_number,
    paymentDate: row.payment_date,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    purchaseOrderId: row.purchase_order_id,
    poNumber: row.po_number,
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    referenceNumber: row.reference_number,
    remarks: row.remarks,
    createdAt: row.created_at,
  };
}

export async function list(req, res) {
  const { supplierId, poId } = req.query;
  const conditions = [];
  const params = [];

  if (supplierId) { params.push(supplierId); conditions.push(`sp.supplier_id = $${params.length}`); }
  if (poId) { params.push(poId); conditions.push(`sp.purchase_order_id = $${params.length}`); }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await getPool().query(
    `select sp.*, s.supplier_name, po.po_number
     from supplier_payments sp
     join suppliers s on s.id = sp.supplier_id
     join purchase_orders po on po.id = sp.purchase_order_id
     ${where} order by sp.payment_date desc, sp.id desc`,
    params
  );
  res.json({ success: true, data: rows.map(mapRow) });
}

export async function create(req, res) {
  const { supplierId, purchaseOrderId, paymentDate, amount, paymentMode, referenceNumber, remarks } = req.body;

  if (!supplierId) throw new ApiError(400, 'Supplier is required.');
  if (!purchaseOrderId) throw new ApiError(400, 'Purchase order is required.');
  if (!paymentDate) throw new ApiError(400, 'Payment date is required.');
  const amountNum = Number(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) {
    throw new ApiError(400, 'Payment amount must be greater than zero.');
  }
  if (!PAYMENT_MODE_OPTIONS.includes(paymentMode)) {
    throw new ApiError(400, 'Please select a valid payment mode.');
  }

  const result = await withTransaction(async (client) => {
    const { rows: poRows } = await client.query(
      'select * from purchase_orders where id = $1 for update',
      [purchaseOrderId]
    );
    if (!poRows.length) throw new ApiError(404, 'Purchase order not found.');
    const po = poRows[0];

    if (po.status === 'Cancelled') {
      throw new ApiError(400, 'Cannot record a payment against a cancelled purchase order.');
    }
    if (Number(po.supplier_id) !== Number(supplierId)) {
      throw new ApiError(400, 'Selected purchase order does not belong to this supplier.');
    }
    if (amountNum > Number(po.balance_amount)) {
      throw new ApiError(400, 'Payment amount exceeds outstanding balance.');
    }

    const paymentNumber = await generateNumber(client, 'SP', { yearly: true });
    const { rows: paymentRows } = await client.query(
      `insert into supplier_payments
        (payment_number, payment_date, supplier_id, purchase_order_id, amount, payment_mode, reference_number, remarks)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [paymentNumber, paymentDate, supplierId, purchaseOrderId, amountNum, paymentMode, referenceNumber || null, remarks || null]
    );

    const newPaid = round2(Number(po.paid_amount) + amountNum);
    const newBalance = round2(Number(po.grand_total) - newPaid);
    const newPaymentStatus = newBalance <= 0 ? 'Paid' : 'Partially Paid';

    await client.query(
      'update purchase_orders set paid_amount = $1, balance_amount = $2, payment_status = $3 where id = $4',
      [newPaid, newBalance, newPaymentStatus, purchaseOrderId]
    );

    return { ...paymentRows[0], po_number: po.po_number };
  });

  res.status(201).json({ success: true, data: mapRow(result) });
}
