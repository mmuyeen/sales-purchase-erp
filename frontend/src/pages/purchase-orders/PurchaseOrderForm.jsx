import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PAYMENT_TERM_OPTIONS } from '@shared/constants.js';
import { resolveStateCode, determineGstType } from '@shared/gst.js';
import { createPurchaseOrder } from '../../api/purchaseOrders.js';
import { listSuppliers } from '../../api/suppliers.js';
import { listProducts } from '../../api/products.js';
import { getCompanyInfo } from '../../api/company.js';
import { computeDocumentTotals } from '../../utils/calculations.js';
import { todayIsoDate } from '../../utils/format.js';
import SearchableSelect from '../../components/SearchableSelect.jsx';
import LineItemsEditor from '../../components/LineItemsEditor.jsx';
import TotalsBox from '../../components/TotalsBox.jsx';

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [poDate, setPoDate] = useState(todayIsoDate());
  const [paymentTerms, setPaymentTerms] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    listSuppliers({ active: 'true' }).then((res) => setSuppliers(res.data)).catch((err) => setError(err.message));
    listProducts({ active: 'true' }).then((res) => setProducts(res.data)).catch((err) => setError(err.message));
    getCompanyInfo().then((res) => setCompany(res.data)).catch(() => {});
  }, []);

  // Purchase Order: the supplier is the GST seller, our company is the buyer —
  // the reverse of a Sales Order/Invoice. This is a live preview only; the
  // backend always resolves and validates this itself on save.
  const selectedSupplier = suppliers.find((s) => String(s.id) === String(supplierId));
  const gstType = useMemo(() => {
    if (!selectedSupplier || !company) return null;
    const supplierStateCode = resolveStateCode({ gstNumber: selectedSupplier.gstNumber, state: selectedSupplier.state });
    return determineGstType(supplierStateCode, company.stateCode);
  }, [selectedSupplier, company]);

  const totals = computeDocumentTotals(items, gstType);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!supplierId) return setError('Please select a supplier.');
    if (items.length === 0) return setError('Please add at least one line item.');

    setSaving(true);
    try {
      const res = await createPurchaseOrder({
        supplierId, poDate, paymentTerms: paymentTerms || null,
        expectedDeliveryDate: expectedDeliveryDate || null, remarks, items,
      });
      navigate(`/purchase-orders/${res.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h1>New Purchase Order</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-grid">
            <div className="form-field">
              <label>Supplier *</label>
              <SearchableSelect
                options={suppliers}
                value={supplierId}
                onChange={setSupplierId}
                getLabel={(s) => `${s.supplierCode} - ${s.name}`}
                getValue={(s) => s.id}
                placeholder="Select supplier"
              />
            </div>
            <div className="form-field">
              <label>PO Date *</label>
              <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Payment Terms</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
                <option value="">None</option>
                {PAYMENT_TERM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Expected Delivery Date</label>
              <input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Remarks</label>
              <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Line Items</h3>
          {selectedSupplier && (
            <p style={{ marginTop: 0, fontSize: '0.85rem', color: '#6b7280' }}>
              GST Type: {gstType === 'INTRA' ? 'Intra-State (CGST + SGST)' : gstType === 'INTER' ? 'Inter-State (IGST)' : 'Unable to determine — check company/supplier state configuration'}
            </p>
          )}
          <LineItemsEditor items={items} products={products} onChange={setItems} priceField="purchasePrice" gstType={gstType} />
          <TotalsBox totals={totals} />
        </div>

        <div className="toolbar">
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Purchase Order'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/purchase-orders')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
