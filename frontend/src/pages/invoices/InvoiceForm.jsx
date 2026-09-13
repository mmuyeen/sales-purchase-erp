import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PAYMENT_TERM_OPTIONS } from '@shared/constants.js';
import { resolveStateCode, determineGstType } from '@shared/gst.js';
import { createInvoice } from '../../api/invoices.js';
import { getSalesOrder } from '../../api/salesOrders.js';
import { listCustomers } from '../../api/customers.js';
import { listProducts } from '../../api/products.js';
import { getCompanyInfo } from '../../api/company.js';
import { computeDocumentTotals } from '../../utils/calculations.js';
import { todayIsoDate } from '../../utils/format.js';
import SearchableSelect from '../../components/SearchableSelect.jsx';
import LineItemsEditor from '../../components/LineItemsEditor.jsx';
import TotalsBox from '../../components/TotalsBox.jsx';

export default function InvoiceForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const salesOrderId = searchParams.get('salesOrderId');

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate());
  const [paymentTerms, setPaymentTerms] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([]);
  const [sourceSoNumber, setSourceSoNumber] = useState('');

  useEffect(() => {
    listCustomers({ active: 'true' }).then((res) => setCustomers(res.data)).catch((err) => setError(err.message));
    listProducts({ active: 'true' }).then((res) => setProducts(res.data)).catch((err) => setError(err.message));
    getCompanyInfo().then((res) => setCompany(res.data)).catch(() => {});
  }, []);

  // Invoice: our company is the GST seller, the customer is the buyer.
  // Live preview only; the backend always resolves and validates this itself
  // fresh at invoice-creation time, and that becomes the permanent record.
  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId));
  const gstType = useMemo(() => {
    if (!selectedCustomer || !company) return null;
    const customerStateCode = resolveStateCode({ gstNumber: selectedCustomer.gstNumber, state: selectedCustomer.state });
    return determineGstType(company.stateCode, customerStateCode);
  }, [selectedCustomer, company]);

  useEffect(() => {
    if (!salesOrderId) return;
    getSalesOrder(salesOrderId).then((res) => {
      const so = res.data;
      setCustomerId(so.customerId);
      setPaymentTerms(so.paymentTerms || '');
      setSourceSoNumber(so.soNumber);
      setItems(so.items.map((item) => ({
        productId: item.productId,
        salesOrderItemId: item.id,
        description: item.description,
        hsnCode: item.hsnCode || '',
        uom: item.uom,
        quantity: item.quantity,
        rate: item.rate,
        discountAmount: item.discountAmount,
        taxPercentage: item.taxPercentage,
      })));
    }).catch((err) => setError(err.message));
  }, [salesOrderId]);

  const totals = computeDocumentTotals(items, gstType);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customerId) return setError('Please select a customer.');
    if (items.length === 0) return setError('Please add at least one line item.');

    setSaving(true);
    try {
      const res = await createInvoice({
        customerId, salesOrderId: salesOrderId || null, invoiceDate,
        paymentTerms: paymentTerms || null, remarks, items,
      });
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h1>New Invoice</h1></div>
      {sourceSoNumber && <div className="alert alert-success">Pre-filled from Sales Order {sourceSoNumber}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-grid">
            <div className="form-field">
              <label>Customer *</label>
              <SearchableSelect
                options={customers}
                value={customerId}
                onChange={setCustomerId}
                getLabel={(c) => `${c.customerCode} - ${c.name}`}
                getValue={(c) => c.id}
                placeholder="Select customer"
                disabled={Boolean(salesOrderId)}
              />
            </div>
            <div className="form-field">
              <label>Invoice Date *</label>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Payment Terms</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
                <option value="">None</option>
                {PAYMENT_TERM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Remarks</label>
              <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Line Items</h3>
          {selectedCustomer && (
            <p style={{ marginTop: 0, fontSize: '0.85rem', color: '#6b7280' }}>
              GST Type: {gstType === 'INTRA' ? 'Intra-State (CGST + SGST)' : gstType === 'INTER' ? 'Inter-State (IGST)' : 'Unable to determine — check company/customer state configuration'}
            </p>
          )}
          <LineItemsEditor items={items} products={products} onChange={setItems} priceField="salesPrice" gstType={gstType} />
          <TotalsBox totals={totals} />
        </div>

        <div className="toolbar">
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Invoice'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/invoices')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
