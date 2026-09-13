import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SALES_ORDER_STATUS_OPTIONS } from '@shared/constants.js';
import { getSalesOrder, updateSalesOrderStatus, deleteSalesOrder } from '../../api/salesOrders.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [so, setSo] = useState(null);
  const [error, setError] = useState('');

  function load() {
    getSalesOrder(id).then((res) => setSo(res.data)).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleStatusChange(status) {
    if (!window.confirm(`Change status to "${status}"?`)) return;
    try {
      await updateSalesOrderStatus(id, status);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this draft sales order? This cannot be undone.')) return;
    try {
      await deleteSalesOrder(id);
      navigate('/sales-orders');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!so) return error ? <div className="alert alert-error">{error}</div> : <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>{so.soNumber}</h1>
        <div className="toolbar">
          <Link className="btn btn-secondary" to={`/invoices/new?salesOrderId=${so.id}`}>Create Invoice</Link>
          <Link className="btn btn-secondary" to="/sales-orders">Back to List</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="form-grid">
          <div><strong>Customer:</strong> {so.customerName}</div>
          <div><strong>SO Date:</strong> {formatDate(so.soDate)}</div>
          <div><strong>Customer GST:</strong> {so.customerGstNumber || '-'}</div>
          <div><strong>Customer State:</strong> {so.customerState || '-'}</div>
          <div><strong>Payment Terms:</strong> {so.paymentTerms || '-'}</div>
          <div><strong>Delivery Date:</strong> {formatDate(so.deliveryDate)}</div>
          <div><strong>Status:</strong> <StatusBadge status={so.status} /></div>
        </div>
        {so.remarks && <p><strong>Remarks:</strong> {so.remarks}</p>}
      </div>

      <div className="card table-wrap">
        <h3 style={{ marginTop: 0 }}>Line Items</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Description</th><th>HSN Code</th><th>UOM</th><th>Qty</th><th>Rate</th>
              <th>Discount</th><th>Tax %</th><th>Tax Amt</th><th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {so.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productCode} - {item.productName}</td>
                <td>{item.description || '-'}</td>
                <td>{item.hsnCode || '-'}</td>
                <td>{item.uom}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.rate)}</td>
                <td>{formatCurrency(item.discountAmount)}</td>
                <td>{item.taxPercentage}%</td>
                <td>{formatCurrency(item.taxAmount)}</td>
                <td>{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="totals-box">
          <table>
            <tbody>
              <tr><td>Subtotal</td><td>{formatCurrency(so.subtotal)}</td></tr>
              <tr><td>Discount</td><td>{formatCurrency(so.discountAmount)}</td></tr>
              <tr><td>Taxable Amount</td><td>{formatCurrency(so.taxableAmount)}</td></tr>
              {so.gstType ? (
                <>
                  <tr><td>CGST</td><td>{formatCurrency(so.cgstAmount)}</td></tr>
                  <tr><td>SGST</td><td>{formatCurrency(so.sgstAmount)}</td></tr>
                  <tr><td>IGST</td><td>{formatCurrency(so.igstAmount)}</td></tr>
                  <tr><td>Total GST</td><td>{formatCurrency(so.totalGst)}</td></tr>
                  <tr><td>Round Off</td><td>{formatCurrency(so.roundOff)}</td></tr>
                </>
              ) : (
                <tr><td>Tax</td><td>{formatCurrency(so.taxAmount)}</td></tr>
              )}
              <tr className="grand-total"><td>Grand Total</td><td>{formatCurrency(so.grandTotal)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Change Status</h3>
        <div className="toolbar">
          {SALES_ORDER_STATUS_OPTIONS.filter((s) => s !== so.status).map((s) => (
            <button key={s} className="btn btn-secondary" onClick={() => handleStatusChange(s)}>
              Mark as {s}
            </button>
          ))}
          {so.status === 'Draft' && (
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}
