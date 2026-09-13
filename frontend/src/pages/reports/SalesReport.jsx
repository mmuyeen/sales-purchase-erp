import { useEffect, useRef, useState } from 'react';
import { INVOICE_STATUS_OPTIONS } from '@shared/constants.js';
import { getSalesReport } from '../../api/reports.js';
import { listCustomers } from '../../api/customers.js';
import { getCompanyInfo } from '../../api/company.js';
import { formatCurrency, formatDate, todayIsoDate } from '../../utils/format.js';
import { exportToCsv } from '../../utils/csv.js';
import { downloadElementAsPdf, sanitizeForFilename } from '../../utils/pdf.js';

export default function SalesReport() {
  const [customers, setCustomers] = useState([]);
  const [company, setCompany] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', customerId: '', invoiceNumber: '', status: '' });
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    listCustomers({ active: 'true' }).then((res) => setCustomers(res.data)).catch(() => {});
    getCompanyInfo().then((res) => setCompany(res.data)).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await getSalesReport(params);
      setRows(res.data.rows);
      setTotals(res.data.totals);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  function handleExport() {
    exportToCsv(
      'sales-report.csv',
      ['Invoice Number', 'Invoice Date', 'Customer', 'Taxable Amount', 'Tax', 'Total', 'Paid', 'Balance', 'Status'],
      rows.map((r) => [r.invoiceNumber, formatDate(r.invoiceDate), r.customerName, r.taxableAmount, r.taxAmount, r.grandTotal, r.paidAmount, r.balanceAmount, r.status])
    );
  }

  async function handleDownloadPdf() {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(
        reportRef.current,
        `Sales_Report_${sanitizeForFilename(todayIsoDate())}`,
        { orientation: 'landscape', noSplitSelector: '.sales-report-table tbody tr' }
      );
    } catch (err) {
      setError(err.message || 'Failed to generate PDF.');
    } finally {
      setDownloading(false);
    }
  }

  const selectedCustomerName = customers.find((c) => String(c.id) === String(filters.customerId))?.name;
  const activeFilters = [
    filters.from && { label: 'From Date', value: formatDate(filters.from) },
    filters.to && { label: 'To Date', value: formatDate(filters.to) },
    filters.customerId && { label: 'Customer', value: selectedCustomerName || filters.customerId },
    filters.invoiceNumber && { label: 'Invoice Number', value: filters.invoiceNumber },
    filters.status && { label: 'Status', value: filters.status },
  ].filter(Boolean);

  return (
    <div>
      <div className="page-header no-print">
        <h1>Sales Report</h1>
        <div className="toolbar no-print">
          <button className="btn btn-secondary" onClick={handleExport} disabled={rows.length === 0}>Export CSV</button>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
          <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={downloading || rows.length === 0}>
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar no-print">
        <div className="form-field">
          <label>From</label>
          <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
        </div>
        <div className="form-field">
          <label>To</label>
          <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Customer</label>
          <select value={filters.customerId} onChange={(e) => setFilter('customerId', e.target.value)}>
            <option value="">All</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Invoice Number</label>
          <input value={filters.invoiceNumber} onChange={(e) => setFilter('invoiceNumber', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All</option>
            {INVOICE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={load}>Search</button>
      </div>

      <div className="sales-report-print" ref={reportRef}>
        <div className="report-print-only" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: '0 0 4px' }}>SALES REPORT</h2>
          {company?.name && <div style={{ fontWeight: 'bold' }}>{company.name}</div>}
          <div>Generated: {formatDate(todayIsoDate())}</div>
          {activeFilters.length > 0 && (
            <div style={{ marginTop: 6, fontSize: '0.85rem' }}>
              {activeFilters.map((f) => (
                <span key={f.label} style={{ marginRight: 16 }}><strong>{f.label}:</strong> {f.value}</span>
              ))}
            </div>
          )}
        </div>

        {totals && (
          <div className="report-print-only" style={{ marginBottom: 14 }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '2px 16px 2px 0' }}><strong>Total Invoices:</strong> {rows.length}</td>
                  <td style={{ padding: '2px 16px' }}><strong>Total Sales:</strong> {formatCurrency(totals.grandTotal)}</td>
                  <td style={{ padding: '2px 16px' }}><strong>Total Taxable Amount:</strong> {formatCurrency(totals.taxableAmount)}</td>
                  <td style={{ padding: '2px 16px' }}><strong>Total GST:</strong> {formatCurrency(totals.taxAmount)}</td>
                  <td style={{ padding: '2px 16px' }}><strong>Total Paid:</strong> {formatCurrency(totals.paidAmount)}</td>
                  <td style={{ padding: '2px 0 2px 16px' }}><strong>Total Balance:</strong> {formatCurrency(totals.balanceAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="card table-wrap">
          <table className="sales-report-table">
            <thead>
              <tr>
                <th>Invoice Number</th><th>Date</th><th>Customer</th><th>Taxable</th><th>Tax</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9}>Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={9}>No invoices found.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.invoiceNumber}</td>
                  <td>{formatDate(r.invoiceDate)}</td>
                  <td>{r.customerName}</td>
                  <td>{formatCurrency(r.taxableAmount)}</td>
                  <td>{formatCurrency(r.taxAmount)}</td>
                  <td>{formatCurrency(r.grandTotal)}</td>
                  <td>{formatCurrency(r.paidAmount)}</td>
                  <td>{formatCurrency(r.balanceAmount)}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr>
                  <td colSpan={3}>Totals</td>
                  <td>{formatCurrency(totals.taxableAmount)}</td>
                  <td>{formatCurrency(totals.taxAmount)}</td>
                  <td>{formatCurrency(totals.grandTotal)}</td>
                  <td>{formatCurrency(totals.paidAmount)}</td>
                  <td>{formatCurrency(totals.balanceAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
