import { useEffect, useState } from 'react';
import { PURCHASE_ORDER_STATUS_OPTIONS } from '@shared/constants.js';
import { getPurchaseOrderReport } from '../../api/reports.js';
import { listSuppliers } from '../../api/suppliers.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { exportToCsv } from '../../utils/csv.js';

export default function PurchaseReport() {
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', supplierId: '', poNumber: '', status: '' });
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listSuppliers({ active: 'true' }).then((res) => setSuppliers(res.data)).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await getPurchaseOrderReport(params);
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
      'purchase-order-report.csv',
      ['PO Number', 'PO Date', 'Supplier', 'Taxable Amount', 'Tax', 'Total', 'Paid', 'Balance', 'Status'],
      rows.map((r) => [r.poNumber, formatDate(r.poDate), r.supplierName, r.taxableAmount, r.taxAmount, r.grandTotal, r.paidAmount, r.balanceAmount, r.status])
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Purchase Order Report</h1>
        <div className="toolbar no-print">
          <button className="btn btn-secondary" onClick={handleExport} disabled={rows.length === 0}>Export CSV</button>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
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
          <label>Supplier</label>
          <select value={filters.supplierId} onChange={(e) => setFilter('supplierId', e.target.value)}>
            <option value="">All</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>PO Number</label>
          <input value={filters.poNumber} onChange={(e) => setFilter('poNumber', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All</option>
            {PURCHASE_ORDER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={load}>Search</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>PO Number</th><th>Date</th><th>Supplier</th><th>Taxable</th><th>Tax</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={9}>No purchase orders found.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.poNumber}</td>
                <td>{formatDate(r.poDate)}</td>
                <td>{r.supplierName}</td>
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
  );
}
