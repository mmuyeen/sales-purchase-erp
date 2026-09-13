import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getInvoice, updateInvoiceStatus, deleteInvoice } from '../../api/invoices.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const MANUAL_NEXT_STATUS = {
  Draft: ['Issued', 'Cancelled'],
  Issued: ['Cancelled'],
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');

  function load() {
    getInvoice(id).then((res) => setInvoice(res.data)).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleStatusChange(status) {
    if (!window.confirm(`Change status to "${status}"?`)) return;
    try {
      await updateInvoiceStatus(id, status);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this draft invoice? This cannot be undone.')) return;
    try {
      await deleteInvoice(id);
      navigate('/invoices');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!invoice) return error ? <div className="alert alert-error">{error}</div> : <p>Loading...</p>;

  const nextStatuses = MANUAL_NEXT_STATUS[invoice.status] || [];

  return (
    <div>
      <div className="page-header">
        <h1>{invoice.invoiceNumber}</h1>
        <div className="toolbar">
          <Link className="btn btn-secondary" to={`/invoices/${invoice.id}/print?action=print`} target="_blank">Print Invoice</Link>
          <Link className="btn btn-secondary" to={`/invoices/${invoice.id}/print?action=download`} target="_blank">Download PDF</Link>
          <Link className="btn btn-secondary" to={`/customer-payments/new?invoiceId=${invoice.id}`}>Record Payment</Link>
          <Link className="btn btn-secondary" to="/invoices">Back to List</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="form-grid">
          <div><strong>Customer:</strong> {invoice.customerName}</div>
          <div><strong>Invoice Date:</strong> {formatDate(invoice.invoiceDate)}</div>
          <div><strong>Customer GST:</strong> {invoice.customerGstNumber || '-'}</div>
          <div><strong>Customer State:</strong> {invoice.customerState || '-'}</div>
          <div><strong>Payment Terms:</strong> {invoice.paymentTerms || '-'}</div>
          <div><strong>Reference SO:</strong> {invoice.soNumber || '-'}</div>
          <div><strong>Status:</strong> <StatusBadge status={invoice.status} /></div>
        </div>
        {invoice.remarks && <p><strong>Remarks:</strong> {invoice.remarks}</p>}
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
            {invoice.items.map((item) => (
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
              <tr><td>Subtotal</td><td>{formatCurrency(invoice.subtotal)}</td></tr>
              <tr><td>Discount</td><td>{formatCurrency(invoice.discountAmount)}</td></tr>
              <tr><td>Taxable Amount</td><td>{formatCurrency(invoice.taxableAmount)}</td></tr>
              {invoice.gstType ? (
                <>
                  <tr><td>CGST</td><td>{formatCurrency(invoice.cgstAmount)}</td></tr>
                  <tr><td>SGST</td><td>{formatCurrency(invoice.sgstAmount)}</td></tr>
                  <tr><td>IGST</td><td>{formatCurrency(invoice.igstAmount)}</td></tr>
                  <tr><td>Total GST</td><td>{formatCurrency(invoice.totalGst)}</td></tr>
                  <tr><td>Round Off</td><td>{formatCurrency(invoice.roundOff)}</td></tr>
                </>
              ) : (
                <tr><td>Tax</td><td>{formatCurrency(invoice.taxAmount)}</td></tr>
              )}
              <tr><td>Paid</td><td>{formatCurrency(invoice.paidAmount)}</td></tr>
              <tr><td>Balance</td><td>{formatCurrency(invoice.balanceAmount)}</td></tr>
              <tr className="grand-total"><td>Grand Total</td><td>{formatCurrency(invoice.grandTotal)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {(nextStatuses.length > 0 || (invoice.status === 'Draft' && Number(invoice.paidAmount) === 0)) && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Change Status</h3>
          <div className="toolbar">
            {nextStatuses.map((s) => (
              <button key={s} className="btn btn-secondary" onClick={() => handleStatusChange(s)}>
                Mark as {s}
              </button>
            ))}
            {invoice.status === 'Draft' && Number(invoice.paidAmount) === 0 && (
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
