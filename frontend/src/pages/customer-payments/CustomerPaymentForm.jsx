import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PAYMENT_MODE_OPTIONS } from '@shared/constants.js';
import { createCustomerPayment } from '../../api/customerPayments.js';
import { listCustomers } from '../../api/customers.js';
import { listInvoices, getInvoice } from '../../api/invoices.js';
import { formatCurrency, todayIsoDate } from '../../utils/format.js';
import SearchableSelect from '../../components/SearchableSelect.jsx';

export default function CustomerPaymentForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetInvoiceId = searchParams.get('invoiceId');

  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODE_OPTIONS[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCustomers({ active: 'true' }).then((res) => setCustomers(res.data)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (presetInvoiceId) {
      getInvoice(presetInvoiceId).then((res) => {
        setCustomerId(res.data.customerId);
        setInvoiceId(res.data.id);
      }).catch((err) => setError(err.message));
    }
  }, [presetInvoiceId]);

  useEffect(() => {
    if (!customerId) { setInvoices([]); return; }
    listInvoices({ customerId }).then((res) => {
      setInvoices(res.data.filter((inv) => Number(inv.balanceAmount) > 0));
    }).catch((err) => setError(err.message));
  }, [customerId]);

  const selectedInvoice = invoices.find((inv) => String(inv.id) === String(invoiceId));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customerId) return setError('Please select a customer.');
    if (!invoiceId) return setError('Please select an invoice.');
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return setError('Please enter a valid payment amount.');

    setSaving(true);
    try {
      await createCustomerPayment({
        customerId, salesInvoiceId: invoiceId, paymentDate, amount: amountNum,
        paymentMode, referenceNumber, remarks,
      });
      navigate('/customer-payments');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Record Customer Payment</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>Customer *</label>
            <SearchableSelect
              options={customers}
              value={customerId}
              onChange={(id) => { setCustomerId(id); setInvoiceId(''); }}
              getLabel={(c) => `${c.customerCode} - ${c.name}`}
              getValue={(c) => c.id}
              placeholder="Select customer"
              disabled={Boolean(presetInvoiceId)}
            />
          </div>
          <div className="form-field">
            <label>Invoice *</label>
            <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} disabled={!customerId}>
              <option value="">Select invoice</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} (Balance: {formatCurrency(inv.balanceAmount)})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Payment Date *</label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Amount *</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {selectedInvoice && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Outstanding: {formatCurrency(selectedInvoice.balanceAmount)}</span>}
          </div>
          <div className="form-field">
            <label>Payment Mode *</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              {PAYMENT_MODE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Reference Number</label>
            <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Remarks</label>
            <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 18 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Payment'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/customer-payments')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
