import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSupplierPayments } from '../../api/supplierPayments.js';
import { listSuppliers } from '../../api/suppliers.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

export default function SupplierPaymentList() {
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
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
      if (supplierId) params.supplierId = supplierId;
      const res = await listSupplierPayments(params);
      setPayments(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <h1>Supplier Payments</h1>
        <Link className="btn btn-primary" to="/supplier-payments/new">+ Record Payment</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar">
        <div className="form-field">
          <label>Supplier</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">All</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={load}>Search</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Payment Number</th><th>Date</th><th>Supplier</th><th>PO</th><th>Amount</th><th>Mode</th><th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7}>Loading...</td></tr>}
            {!loading && payments.length === 0 && <tr><td colSpan={7}>No payments found.</td></tr>}
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.paymentNumber}</td>
                <td>{formatDate(p.paymentDate)}</td>
                <td>{p.supplierName}</td>
                <td>{p.poNumber}</td>
                <td>{formatCurrency(p.amount)}</td>
                <td>{p.paymentMode}</td>
                <td>{p.referenceNumber || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
