import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PURCHASE_ORDER_STATUS_OPTIONS } from '@shared/constants.js';
import { listPurchaseOrders } from '../../api/purchaseOrders.js';
import { listSuppliers } from '../../api/suppliers.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({ supplierId: '', status: '', from: '', to: '', poNumber: '' });
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
      const res = await listPurchaseOrders(params);
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
        <h1>Purchase Orders</h1>
        <Link className="btn btn-primary" to="/purchase-orders/new">+ New Purchase Order</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar">
        <div className="form-field">
          <label>PO Number</label>
          <input value={filters.poNumber} onChange={(e) => setFilter('poNumber', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Supplier</label>
          <select value={filters.supplierId} onChange={(e) => setFilter('supplierId', e.target.value)}>
            <option value="">All</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All</option>
            {PURCHASE_ORDER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
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
              <th>PO Number</th><th>Date</th><th>Supplier</th><th>Grand Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Payment</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9}>Loading...</td></tr>}
            {!loading && orders.length === 0 && <tr><td colSpan={9}>No purchase orders found.</td></tr>}
            {orders.map((po) => (
              <tr key={po.id}>
                <td>{po.poNumber}</td>
                <td>{formatDate(po.poDate)}</td>
                <td>{po.supplierName}</td>
                <td>{formatCurrency(po.grandTotal)}</td>
                <td>{formatCurrency(po.paidAmount)}</td>
                <td>{formatCurrency(po.balanceAmount)}</td>
                <td><StatusBadge status={po.status} /></td>
                <td><StatusBadge status={po.paymentStatus} /></td>
                <td><Link className="link-plain" to={`/purchase-orders/${po.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
