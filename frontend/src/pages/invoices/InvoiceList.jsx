import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { INVOICE_STATUS_OPTIONS } from '@shared/constants.js';
import { listInvoices } from '../../api/invoices.js';
import { listCustomers } from '../../api/customers.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ customerId: '', status: '', from: '', to: '', invoiceNumber: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listCustomers({ active: 'true' }).then((res) => setCustomers(res.data)).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await listInvoices(params);
      setInvoices(res.data);
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

  return (
    <div>
      <div className="page-header">
        <h1>Sales Invoices</h1>
        <Link className="btn btn-primary" to="/invoices/new">+ New Invoice</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar">
        <div className="form-field">
          <label>Invoice Number</label>
          <input value={filters.invoiceNumber} onChange={(e) => setFilter('invoiceNumber', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Customer</label>
          <select value={filters.customerId} onChange={(e) => setFilter('customerId', e.target.value)}>
            <option value="">All</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All</option>
            {INVOICE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>From</label>
          <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
        </div>
        <div className="form-field">
          <label>To</label>
          <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
        </div>
        <button className="btn btn-secondary" onClick={load}>Search</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th><th>Date</th><th>Customer</th><th>Grand Total</th><th>Paid</th><th>Balance</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8}>Loading...</td></tr>}
            {!loading && invoices.length === 0 && <tr><td colSpan={8}>No invoices found.</td></tr>}
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoiceNumber}</td>
                <td>{formatDate(inv.invoiceDate)}</td>
                <td>{inv.customerName}</td>
                <td>{formatCurrency(inv.grandTotal)}</td>
                <td>{formatCurrency(inv.paidAmount)}</td>
                <td>{formatCurrency(inv.balanceAmount)}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td><Link className="link-plain" to={`/invoices/${inv.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
