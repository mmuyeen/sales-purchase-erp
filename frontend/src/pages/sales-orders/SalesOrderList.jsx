import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SALES_ORDER_STATUS_OPTIONS } from '@shared/constants.js';
import { listSalesOrders } from '../../api/salesOrders.js';
import { listCustomers } from '../../api/customers.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function SalesOrderList() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ customerId: '', status: '', from: '', to: '', soNumber: '' });
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
      const res = await listSalesOrders(params);
      setOrders(res.data);
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
        <h1>Sales Orders</h1>
        <Link className="btn btn-primary" to="/sales-orders/new">+ New Sales Order</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar">
        <div className="form-field">
          <label>SO Number</label>
          <input value={filters.soNumber} onChange={(e) => setFilter('soNumber', e.target.value)} />
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
            {SALES_ORDER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
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
              <th>SO Number</th><th>Date</th><th>Customer</th><th>Grand Total</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6}>Loading...</td></tr>}
            {!loading && orders.length === 0 && <tr><td colSpan={6}>No sales orders found.</td></tr>}
            {orders.map((so) => (
              <tr key={so.id}>
                <td>{so.soNumber}</td>
                <td>{formatDate(so.soDate)}</td>
                <td>{so.customerName}</td>
                <td>{formatCurrency(so.grandTotal)}</td>
                <td><StatusBadge status={so.status} /></td>
                <td><Link className="link-plain" to={`/sales-orders/${so.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
