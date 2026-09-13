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
    customerId: row.customer_id,
    customerName: row.customer_name,
    salesInvoiceId: row.sales_invoice_id,
    invoiceNumber: row.invoice_number,
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    referenceNumber: row.reference_number,
    remarks: row.remarks,
    createdAt: row.created_at,
  };
}

export async function list(req, res) {
  const { customerId, invoiceId } = req.query;
  const conditions = [];
  const params = [];

  if (customerId) { params.push(customerId); conditions.push(`cp.customer_id = $${params.length}`); }
  if (invoiceId) { params.push(invoiceId); conditions.push(`cp.sales_invoice_id = $${params.length}`); }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await getPool().query(
    `select cp.*, c.customer_name, si.invoice_number
     from customer_payments cp
     join customers c on c.id = cp.customer_id
     join sales_invoices si on si.id = cp.sales_invoice_id
     ${where} order by cp.payment_date desc, cp.id desc`,
    params
  );
  res.json({ success: true, data: rows.map(mapRow) });
}

export async function create(req, res) {
  const { customerId, salesInvoiceId, paymentDate, amount, paymentMode, referenceNumber, remarks } = req.body;

  if (!customerId) throw new ApiError(400, 'Customer is required.');
  if (!salesInvoiceId) throw new ApiError(400, 'Invoice is required.');
  if (!paymentDate) throw new ApiError(400, 'Payment date is required.');
  const amountNum = Number(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) {
    throw new ApiError(400, 'Payment amount must be greater than zero.');
  }
  if (!PAYMENT_MODE_OPTIONS.includes(paymentMode)) {
    throw new ApiError(400, 'Please select a valid payment mode.');
  }

  const result = await withTransaction(async (client) => {
    const { rows: invoiceRows } = await client.query(
      'select * from sales_invoices where id = $1 for update',
      [salesInvoiceId]
    );
    if (!invoiceRows.length) throw new ApiError(404, 'Invoice not found.');
    const invoice = invoiceRows[0];

    if (invoice.status === 'Cancelled') {
      throw new ApiError(400, 'Cannot record a payment against a cancelled invoice.');
    }
    if (Number(invoice.customer_id) !== Number(customerId)) {
      throw new ApiError(400, 'Selected invoice does not belong to this customer.');
    }
    if (amountNum > Number(invoice.balance_amount)) {
      throw new ApiError(400, 'Payment amount exceeds outstanding balance.');
    }

    const paymentNumber = await generateNumber(client, 'CP', { yearly: true });
    const { rows: paymentRows } = await client.query(
      `insert into customer_payments
        (payment_number, payment_date, customer_id, sales_invoice_id, amount, payment_mode, reference_number, remarks)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [paymentNumber, paymentDate, customerId, salesInvoiceId, amountNum, paymentMode, referenceNumber || null, remarks || null]
    );

    const newPaid = round2(Number(invoice.paid_amount) + amountNum);
    const newBalance = round2(Number(invoice.grand_total) - newPaid);
    const newStatus = newBalance <= 0 ? 'Paid' : 'Partially Paid';

    await client.query(
      'update sales_invoices set paid_amount = $1, balance_amount = $2, status = $3 where id = $4',
      [newPaid, newBalance, newStatus, salesInvoiceId]
    );

    return { ...paymentRows[0], invoice_number: invoice.invoice_number };
  });

  res.status(201).json({ success: true, data: mapRow(result) });
}
