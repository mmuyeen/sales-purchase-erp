import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PURCHASE_ORDER_STATUS_OPTIONS } from '@shared/constants.js';
import { getPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder } from '../../api/purchaseOrders.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [error, setError] = useState('');

  function load() {
    getPurchaseOrder(id).then((res) => setPo(res.data)).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleStatusChange(status) {
    if (!window.confirm(`Change status to "${status}"?`)) return;
    try {
      await updatePurchaseOrderStatus(id, status);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this draft purchase order? This cannot be undone.')) return;
    try {
      await deletePurchaseOrder(id);
      navigate('/purchase-orders');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!po) return error ? <div className="alert alert-error">{error}</div> : <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>{po.poNumber}</h1>
        <div className="toolbar">
          <Link className="btn btn-secondary" to={`/supplier-payments/new?purchaseOrderId=${po.id}`}>Record Payment</Link>
          <Link className="btn btn-secondary" to="/purchase-orders">Back to List</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="form-grid">
          <div><strong>Supplier:</strong> {po.supplierName}</div>
          <div><strong>PO Date:</strong> {formatDate(po.poDate)}</div>
          <div><strong>Supplier GST:</strong> {po.supplierGstNumber || '-'}</div>
          <div><strong>Supplier State:</strong> {po.supplierState || '-'}</div>
          <div><strong>Payment Terms:</strong> {po.paymentTerms || '-'}</div>
          <div><strong>Expected Delivery:</strong> {formatDate(po.expectedDeliveryDate)}</div>
          <div><strong>Status:</strong> <StatusBadge status={po.status} /></div>
          <div><strong>Payment Status:</strong> <StatusBadge status={po.paymentStatus} /></div>
        </div>
        {po.remarks && <p><strong>Remarks:</strong> {po.remarks}</p>}
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
            {po.items.map((item) => (
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
              <tr><td>Subtotal</td><td>{formatCurrency(po.subtotal)}</td></tr>
              <tr><td>Discount</td><td>{formatCurrency(po.discountAmount)}</td></tr>
              <tr><td>Taxable Amount</td><td>{formatCurrency(po.taxableAmount)}</td></tr>
              {po.gstType ? (
                <>
                  <tr><td>CGST</td><td>{formatCurrency(po.cgstAmount)}</td></tr>
                  <tr><td>SGST</td><td>{formatCurrency(po.sgstAmount)}</td></tr>
                  <tr><td>IGST</td><td>{formatCurrency(po.igstAmount)}</td></tr>
                  <tr><td>Total GST</td><td>{formatCurrency(po.totalGst)}</td></tr>
                  <tr><td>Round Off</td><td>{formatCurrency(po.roundOff)}</td></tr>
                </>
              ) : (
                <tr><td>Tax</td><td>{formatCurrency(po.taxAmount)}</td></tr>
              )}
              <tr><td>Paid</td><td>{formatCurrency(po.paidAmount)}</td></tr>
              <tr><td>Balance</td><td>{formatCurrency(po.balanceAmount)}</td></tr>
              <tr className="grand-total"><td>Grand Total</td><td>{formatCurrency(po.grandTotal)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Change Status</h3>
        <div className="toolbar">
          {PURCHASE_ORDER_STATUS_OPTIONS.filter((s) => s !== po.status).map((s) => (
            <button key={s} className="btn btn-secondary" onClick={() => handleStatusChange(s)}>
              Mark as {s}
            </button>
          ))}
          {po.status === 'Draft' && Number(po.paidAmount) === 0 && (
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}
