import { useEffect, useState } from 'react';
import { getProductSalesPaymentReport } from '../../api/reports.js';
import { listProducts } from '../../api/products.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { exportToCsv } from '../../utils/csv.js';
import SearchableSelect from '../../components/SearchableSelect.jsx';

const EMPTY_FILTERS = { productId: '', fromDate: '', toDate: '' };

const SUMMARY_CARDS = [
  { key: 'distinctInvoiceCount', label: 'Distinct Invoices', format: (v) => v },
  { key: 'distinctCustomerCount', label: 'Distinct Customers', format: (v) => v },
  { key: 'totalQuantity', label: 'Total Quantity Sold', format: (v) => v },
  { key: 'totalTaxableAmount', label: 'Total Product Taxable Amount', format: formatCurrency },
  { key: 'totalTaxAmount', label: 'Total Product Tax', format: formatCurrency },
  { key: 'totalLineAmount', label: 'Total Product Line Amount', format: formatCurrency },
  { key: 'totalInvoiceAmount', label: 'Total Invoice Amount', format: formatCurrency },
  { key: 'totalPaid', label: 'Total Paid', format: formatCurrency },
  { key: 'totalPending', label: 'Total Pending', format: formatCurrency },
];

export default function ProductSalesPaymentReport() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    // Intentionally not filtered to active-only: past invoices may reference a
    // product that has since been deactivated, and this report should still
    // surface that sales history.
    listProducts().then((res) => setProducts(res.data)).catch((err) => setError(err.message));
  }, []);

  function setFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  async function handleSearch() {
    setError('');
    if (!filters.productId) {
      setError('Please select a product.');
      return;
    }
    setLoading(true);
    try {
      const params = { product_id: filters.productId };
      if (filters.fromDate) params.from_date = filters.fromDate;
      if (filters.toDate) params.to_date = filters.toDate;
      const res = await getProductSalesPaymentReport(params);
      setReport(res.data);
      setSearched(true);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS);
    setReport(null);
    setError('');
    setSearched(false);
  }

  function handleExport() {
    if (!report) return;
    exportToCsv(
      `product-sales-payment-${report.product.productCode}.csv`,
      [
        'Invoice Number', 'Invoice Date', 'Customer Name', 'Product Name', 'HSN Code', 'Quantity', 'UOM', 'Rate',
        'Discount', 'Tax %', 'Product Tax Amount', 'Product Line Total', 'Invoice Grand Total',
        'Invoice Paid Amount', 'Invoice Balance', 'Latest Payment Date', 'Payment Status',
      ],
      report.rows.map((r) => [
        r.invoiceNumber, formatDate(r.invoiceDate), r.customerName, r.productName, r.hsnCode || '', r.quantity, r.uom, r.rate,
        r.discountAmount, r.taxPercentage, r.taxAmount, r.lineTotal, r.invoiceGrandTotal,
        r.invoicePaidAmount, r.invoiceBalanceAmount, r.latestPaymentDate ? formatDate(r.latestPaymentDate) : '', r.status,
      ])
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Product Sales &amp; Payment Report</h1>
        <div className="toolbar no-print">
          <button className="btn btn-secondary" onClick={handleExport} disabled={!report || report.rows.length === 0}>Export CSV</button>
          <button className="btn btn-secondary" onClick={() => window.print()} disabled={!report}>Print</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar no-print">
        <div className="form-field" style={{ minWidth: 260 }}>
          <label>Product *</label>
          <SearchableSelect
            options={products}
            value={filters.productId}
            onChange={(id) => setFilter('productId', id)}
            getLabel={(p) => `${p.productCode} - ${p.name}`}
            getValue={(p) => p.id}
            placeholder="Select product"
          />
        </div>
        <div className="form-field">
          <label>From Date</label>
          <input type="date" value={filters.fromDate} onChange={(e) => setFilter('fromDate', e.target.value)} />
        </div>
        <div className="form-field">
          <label>To Date</label>
          <input type="date" value={filters.toDate} onChange={(e) => setFilter('toDate', e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        <button className="btn btn-secondary" onClick={handleClear}>Clear Filters</button>
      </div>

      {report && (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>
              Product Summary — {report.product.productCode} · {report.product.productName}
              {report.product.hsnCode ? ` · HSN ${report.product.hsnCode}` : ''}
            </h3>
            <div className="dashboard-cards">
              {SUMMARY_CARDS.map((card) => (
                <div className="card dashboard-card" key={card.key} style={{ marginBottom: 0 }}>
                  <div className="label">{card.label}</div>
                  <div className="value">{card.format(report.summary[card.key])}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card table-wrap">
            <h3 style={{ marginTop: 0 }}>Customer Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Customer</th><th>No. of Invoices</th><th>Product Quantity</th><th>Invoice Value</th><th>Paid</th><th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {report.customerSummary.length === 0 && <tr><td colSpan={6}>No customers found for this product.</td></tr>}
                {report.customerSummary.map((c) => (
                  <tr key={c.customerId}>
                    <td>{c.customerName}</td>
                    <td>{c.invoiceCount}</td>
                    <td>{c.productQuantity}</td>
                    <td>{formatCurrency(c.invoiceValue)}</td>
                    <td>{formatCurrency(c.paidAmount)}</td>
                    <td>{formatCurrency(c.pendingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <h3 style={{ marginTop: 0 }}>Invoice Detail</h3>
            <table>
              <thead>
                <tr>
                  <th>Invoice No.</th><th>Invoice Date</th><th>Customer</th><th>Product</th><th>HSN Code</th><th>Qty</th><th>UOM</th>
                  <th>Rate</th><th>Discount</th><th>Tax %</th><th>Product Tax</th><th>Product Total</th>
                  <th>Invoice Total</th><th>Paid</th><th>Balance</th><th>Last Payment</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.length === 0 && <tr><td colSpan={17}>No invoices found for this product in the selected date range.</td></tr>}
                {report.rows.map((r) => (
                  <tr key={r.invoiceId}>
                    <td>{r.invoiceNumber}</td>
                    <td>{formatDate(r.invoiceDate)}</td>
                    <td>{r.customerName}</td>
                    <td>{r.productName}</td>
                    <td>{r.hsnCode || '-'}</td>
                    <td>{r.quantity}</td>
                    <td>{r.uom}</td>
                    <td>{formatCurrency(r.rate)}</td>
                    <td>{formatCurrency(r.discountAmount)}</td>
                    <td>{r.taxPercentage}%</td>
                    <td>{formatCurrency(r.taxAmount)}</td>
                    <td>{formatCurrency(r.lineTotal)}</td>
                    <td>{formatCurrency(r.invoiceGrandTotal)}</td>
                    <td>{formatCurrency(r.invoicePaidAmount)}</td>
                    <td>{formatCurrency(r.invoiceBalanceAmount)}</td>
                    <td>{r.latestPaymentDate ? formatDate(r.latestPaymentDate) : '-'}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!report && searched === false && !error && (
        <div className="card">Select a product and click Search to view its sales and payment history.</div>
      )}
    </div>
  );
}
