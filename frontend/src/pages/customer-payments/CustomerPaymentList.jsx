import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCustomerPayments } from '../../api/customerPayments.js';
import { listCustomers } from '../../api/customers.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

export default function CustomerPaymentList() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
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
      if (customerId) params.customerId = customerId;
      const res = await listCustomerPayments(params);
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
        <h1>Customer Payments</h1>
        <Link className="btn btn-primary" to="/customer-payments/new">+ Record Payment</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar">
        <div className="form-field">
          <label>Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">All</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={load}>Search</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Payment Number</th><th>Date</th><th>Customer</th><th>Invoice</th><th>Amount</th><th>Mode</th><th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7}>Loading...</td></tr>}
            {!loading && payments.length === 0 && <tr><td colSpan={7}>No payments found.</td></tr>}
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.paymentNumber}</td>
                <td>{formatDate(p.paymentDate)}</td>
                <td>{p.customerName}</td>
                <td>{p.invoiceNumber}</td>
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
