import { getPool } from '../db.js';
import { round2 } from '../services/calculations.js';
import { ApiError } from '../middleware/ApiError.js';

function mapInvoiceRow(row) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    customerName: row.customer_name,
    taxableAmount: Number(row.taxable_amount),
    taxAmount: Number(row.tax_amount),
    grandTotal: Number(row.grand_total),
    paidAmount: Number(row.paid_amount),
    balanceAmount: Number(row.balance_amount),
    status: row.status,
  };
}

function mapPoRow(row) {
  return {
    id: row.id,
    poNumber: row.po_number,
    poDate: row.po_date,
    supplierName: row.supplier_name,
    taxableAmount: Number(row.taxable_amount),
    taxAmount: Number(row.tax_amount),
    grandTotal: Number(row.grand_total),
    paidAmount: Number(row.paid_amount),
    balanceAmount: Number(row.balance_amount),
    status: row.status,
  };
}

function sumTotals(rows) {
  return rows.reduce(
    (acc, r) => ({
      taxableAmount: round2(acc.taxableAmount + r.taxableAmount),
      taxAmount: round2(acc.taxAmount + r.taxAmount),
      grandTotal: round2(acc.grandTotal + r.grandTotal),
      paidAmount: round2(acc.paidAmount + r.paidAmount),
      balanceAmount: round2(acc.balanceAmount + r.balanceAmount),
    }),
    { taxableAmount: 0, taxAmount: 0, grandTotal: 0, paidAmount: 0, balanceAmount: 0 }
  );
}

export async function salesReport(req, res) {
  const { from, to, customerId, invoiceNumber, status } = req.query;
  const params = [req.user.id];
  const conditions = ['si.user_id = $1'];

  if (from) { params.push(from); conditions.push(`si.invoice_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`si.invoice_date <= $${params.length}`); }
  if (customerId) { params.push(customerId); conditions.push(`si.customer_id = $${params.length}`); }
  if (invoiceNumber) { params.push(`%${invoiceNumber}%`); conditions.push(`si.invoice_number ilike $${params.length}`); }
  if (status) { params.push(status); conditions.push(`si.status = $${params.length}`); }

  const { rows } = await getPool().query(
    `select si.*, c.customer_name
     from sales_invoices si
     join customers c on c.id = si.customer_id
     where ${conditions.join(' and ')} order by si.invoice_date desc, si.id desc`,
    params
  );

  const data = rows.map(mapInvoiceRow);
  res.json({ success: true, data: { rows: data, totals: sumTotals(data) } });
}

export async function purchaseOrderReport(req, res) {
  const { from, to, supplierId, poNumber, status } = req.query;
  const params = [req.user.id];
  const conditions = ['po.user_id = $1'];

  if (from) { params.push(from); conditions.push(`po.po_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`po.po_date <= $${params.length}`); }
  if (supplierId) { params.push(supplierId); conditions.push(`po.supplier_id = $${params.length}`); }
  if (poNumber) { params.push(`%${poNumber}%`); conditions.push(`po.po_number ilike $${params.length}`); }
  if (status) { params.push(status); conditions.push(`po.status = $${params.length}`); }

  const { rows } = await getPool().query(
    `select po.*, s.supplier_name
     from purchase_orders po
     join suppliers s on s.id = po.supplier_id
     where ${conditions.join(' and ')} order by po.po_date desc, po.id desc`,
    params
  );

  const data = rows.map(mapPoRow);
  res.json({ success: true, data: { rows: data, totals: sumTotals(data) } });
}

// Product-based sales & payment report.
//
// Payments are stored per sales_invoice, not per invoice line item, so this query
// is built in three stages to avoid double-counting when an invoice contains
// multiple products (or multiple lines of the same product):
//   1. target_items  - collapses the SELECTED PRODUCT's line(s) down to one row
//                       per invoice (SUM quantity/discount/tax/line_total per
//                       sales_invoice_id), independent of how many other
//                       products/lines that invoice also has.
//   2. invoice_payments - collapses customer_payments down to one row per
//                       invoice (SUM amount, MAX payment_date per
//                       sales_invoice_id), so an invoice's payment total is
//                       computed exactly once regardless of how many products
//                       are being reported on.
//   3. final SELECT     - joins those two (both already 1 row per invoice) to
//                       sales_invoices/customers, so the result is naturally
//                       one row per invoice containing the selected product,
//                       with that invoice's payment totals attached once.
//
// Tenant scoping: the product lookup below confirms the product belongs to
// the authenticated user; the final query also filters si.user_id directly
// as defense in depth, rather than relying solely on that transitive check.
export async function productSalesPaymentsReport(req, res) {
  const { product_id: productId, from_date: fromDate, to_date: toDate } = req.query;

  if (!productId) {
    throw new ApiError(400, 'Please select a product.');
  }

  const pool = getPool();

  const productRes = await pool.query(
    'select id, product_code, product_name, hsn_code from products where id = $1 and user_id = $2',
    [productId, req.user.id]
  );
  if (!productRes.rows.length) {
    throw new ApiError(404, 'Product not found.');
  }
  const product = productRes.rows[0];

  const params = [productId, req.user.id];
  const dateConditions = [];
  if (fromDate) { params.push(fromDate); dateConditions.push(`si.invoice_date >= $${params.length}`); }
  if (toDate) { params.push(toDate); dateConditions.push(`si.invoice_date <= $${params.length}`); }
  const dateWhere = dateConditions.length ? `and ${dateConditions.join(' and ')}` : '';

  const { rows } = await pool.query(
    `with target_items as (
       select
         sales_invoice_id,
         sum(quantity) as product_quantity,
         (array_agg(uom))[1] as uom,
         (array_agg(hsn_code))[1] as hsn_code,
         sum(quantity * rate) as gross_amount,
         sum(discount_amount) as discount_amount,
         sum(quantity * rate - discount_amount) as taxable_amount,
         sum(tax_amount) as tax_amount,
         sum(line_total) as line_total
       from sales_invoice_items
       where product_id = $1
       group by sales_invoice_id
     ),
     invoice_payments as (
       select
         sales_invoice_id,
         sum(amount) as total_paid,
         max(payment_date) as latest_payment_date
       from customer_payments
       group by sales_invoice_id
     )
     select
       si.id as invoice_id,
       si.invoice_number,
       si.invoice_date,
       c.id as customer_id,
       c.customer_name,
       c.gst_number as customer_gst_number,
       ti.product_quantity,
       ti.uom,
       ti.hsn_code,
       case when ti.product_quantity > 0
         then round((ti.gross_amount / ti.product_quantity)::numeric, 2)
         else 0
       end as rate,
       ti.discount_amount,
       ti.taxable_amount,
       ti.tax_amount,
       ti.line_total,
       si.grand_total,
       coalesce(ip.total_paid, 0) as paid_amount,
       (si.grand_total - coalesce(ip.total_paid, 0)) as balance_amount,
       ip.latest_payment_date,
       si.status
     from target_items ti
     join sales_invoices si on si.id = ti.sales_invoice_id
     join customers c on c.id = si.customer_id
     left join invoice_payments ip on ip.sales_invoice_id = si.id
     where si.user_id = $2 ${dateWhere}
     order by si.invoice_date desc, si.id desc`,
    params
  );

  const detail = rows.map((r) => {
    const taxableAmount = Number(r.taxable_amount);
    const taxAmount = Number(r.tax_amount);
    return {
      invoiceId: r.invoice_id,
      invoiceNumber: r.invoice_number,
      invoiceDate: r.invoice_date,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerGstNumber: r.customer_gst_number,
      productName: product.product_name,
      hsnCode: r.hsn_code,
      quantity: Number(r.product_quantity),
      uom: r.uom,
      rate: Number(r.rate),
      discountAmount: Number(r.discount_amount),
      taxableAmount,
      taxPercentage: taxableAmount > 0 ? round2((taxAmount / taxableAmount) * 100) : 0,
      taxAmount,
      lineTotal: Number(r.line_total),
      invoiceGrandTotal: Number(r.grand_total),
      invoicePaidAmount: Number(r.paid_amount),
      invoiceBalanceAmount: Number(r.balance_amount),
      latestPaymentDate: r.latest_payment_date,
      status: r.status,
    };
  });

  // Both loops below fold the already-one-row-per-invoice `detail` array, so
  // summing invoiceGrandTotal/invoicePaidAmount/invoiceBalanceAmount here can
  // never double-count a payment, no matter how many line items an invoice has.
  const distinctInvoiceIds = new Set();
  const distinctCustomerIds = new Set();
  const summary = {
    totalQuantity: 0,
    totalTaxableAmount: 0,
    totalTaxAmount: 0,
    totalLineAmount: 0,
    totalInvoiceAmount: 0,
    totalPaid: 0,
    totalPending: 0,
  };
  const customerSummaryMap = new Map();

  detail.forEach((r) => {
    distinctInvoiceIds.add(r.invoiceId);
    distinctCustomerIds.add(r.customerId);
    summary.totalQuantity = round2(summary.totalQuantity + r.quantity);
    summary.totalTaxableAmount = round2(summary.totalTaxableAmount + r.taxableAmount);
    summary.totalTaxAmount = round2(summary.totalTaxAmount + r.taxAmount);
    summary.totalLineAmount = round2(summary.totalLineAmount + r.lineTotal);
    summary.totalInvoiceAmount = round2(summary.totalInvoiceAmount + r.invoiceGrandTotal);
    summary.totalPaid = round2(summary.totalPaid + r.invoicePaidAmount);
    summary.totalPending = round2(summary.totalPending + r.invoiceBalanceAmount);

    if (!customerSummaryMap.has(r.customerId)) {
      customerSummaryMap.set(r.customerId, {
        customerId: r.customerId,
        customerName: r.customerName,
        invoiceCount: 0,
        productQuantity: 0,
        invoiceValue: 0,
        paidAmount: 0,
        pendingAmount: 0,
      });
    }
    const entry = customerSummaryMap.get(r.customerId);
    entry.invoiceCount += 1;
    entry.productQuantity = round2(entry.productQuantity + r.quantity);
    entry.invoiceValue = round2(entry.invoiceValue + r.invoiceGrandTotal);
    entry.paidAmount = round2(entry.paidAmount + r.invoicePaidAmount);
    entry.pendingAmount = round2(entry.pendingAmount + r.invoiceBalanceAmount);
  });

  res.json({
    success: true,
    data: {
      product: {
        id: product.id,
        productCode: product.product_code,
        productName: product.product_name,
        hsnCode: product.hsn_code,
      },
      summary: {
        distinctInvoiceCount: distinctInvoiceIds.size,
        distinctCustomerCount: distinctCustomerIds.size,
        ...summary,
      },
      customerSummary: Array.from(customerSummaryMap.values())
        .sort((a, b) => a.customerName.localeCompare(b.customerName)),
      rows: detail,
    },
  });
}
