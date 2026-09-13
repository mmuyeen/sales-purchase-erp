import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PAYMENT_MODE_OPTIONS } from '@shared/constants.js';
import { createSupplierPayment } from '../../api/supplierPayments.js';
import { listSuppliers } from '../../api/suppliers.js';
import { listPurchaseOrders, getPurchaseOrder } from '../../api/purchaseOrders.js';
import { formatCurrency, todayIsoDate } from '../../utils/format.js';
import SearchableSelect from '../../components/SearchableSelect.jsx';

export default function SupplierPaymentForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetPoId = searchParams.get('purchaseOrderId');

  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODE_OPTIONS[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listSuppliers({ active: 'true' }).then((res) => setSuppliers(res.data)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (presetPoId) {
      getPurchaseOrder(presetPoId).then((res) => {
        setSupplierId(res.data.supplierId);
        setPurchaseOrderId(res.data.id);
      }).catch((err) => setError(err.message));
    }
  }, [presetPoId]);

  useEffect(() => {
    if (!supplierId) { setOrders([]); return; }
    listPurchaseOrders({ supplierId }).then((res) => {
      setOrders(res.data.filter((po) => Number(po.balanceAmount) > 0));
    }).catch((err) => setError(err.message));
  }, [supplierId]);

  const selectedPo = orders.find((po) => String(po.id) === String(purchaseOrderId));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!supplierId) return setError('Please select a supplier.');
    if (!purchaseOrderId) return setError('Please select a purchase order.');
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return setError('Please enter a valid payment amount.');

    setSaving(true);
    try {
      await createSupplierPayment({
        supplierId, purchaseOrderId, paymentDate, amount: amountNum,
        paymentMode, referenceNumber, remarks,
      });
      navigate('/supplier-payments');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Record Supplier Payment</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>Supplier *</label>
            <SearchableSelect
              options={suppliers}
              value={supplierId}
              onChange={(id) => { setSupplierId(id); setPurchaseOrderId(''); }}
              getLabel={(s) => `${s.supplierCode} - ${s.name}`}
              getValue={(s) => s.id}
              placeholder="Select supplier"
              disabled={Boolean(presetPoId)}
            />
          </div>
          <div className="form-field">
            <label>Purchase Order *</label>
            <select value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} disabled={!supplierId}>
              <option value="">Select purchase order</option>
              {orders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} (Balance: {formatCurrency(po.balanceAmount)})
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
            {selectedPo && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Outstanding: {formatCurrency(selectedPo.balanceAmount)}</span>}
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
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/supplier-payments')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
