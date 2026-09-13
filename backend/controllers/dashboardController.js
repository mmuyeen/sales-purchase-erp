import { getPool } from '../db.js';

export async function summary(req, res) {
  const pool = getPool();

  const [
    customers,
    suppliers,
    products,
    salesToday,
    salesMonth,
    poMonth,
    customerOutstanding,
    supplierOutstanding,
  ] = await Promise.all([
    pool.query("select count(*)::int as count from customers where is_active = true"),
    pool.query("select count(*)::int as count from suppliers where is_active = true"),
    pool.query("select count(*)::int as count from products where is_active = true"),
    pool.query(
      "select coalesce(sum(grand_total),0) as total from sales_invoices where invoice_date = current_date and status <> 'Cancelled'"
    ),
    pool.query(
      `select coalesce(sum(grand_total),0) as total from sales_invoices
       where date_trunc('month', invoice_date) = date_trunc('month', current_date) and status <> 'Cancelled'`
    ),
    pool.query(
      "select count(*)::int as count from purchase_orders where date_trunc('month', po_date) = date_trunc('month', current_date)"
    ),
    pool.query(
      "select coalesce(sum(balance_amount),0) as total from sales_invoices where status not in ('Paid','Cancelled')"
    ),
    pool.query(
      "select coalesce(sum(balance_amount),0) as total from purchase_orders where payment_status <> 'Paid' and status <> 'Cancelled'"
    ),
  ]);

  res.json({
    success: true,
    data: {
      totalCustomers: customers.rows[0].count,
      totalSuppliers: suppliers.rows[0].count,
      totalProducts: products.rows[0].count,
      salesToday: Number(salesToday.rows[0].total),
      salesThisMonth: Number(salesMonth.rows[0].total),
      purchaseOrdersThisMonth: poMonth.rows[0].count,
      outstandingCustomerAmount: Number(customerOutstanding.rows[0].total),
      outstandingSupplierAmount: Number(supplierOutstanding.rows[0].total),
    },
  });
}
