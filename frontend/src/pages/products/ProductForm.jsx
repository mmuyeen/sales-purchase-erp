import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UOM_OPTIONS, TAX_RATE_OPTIONS, PAYMENT_TERM_OPTIONS, HSN_CODE_REGEX } from '@shared/constants.js';
import { createProduct, getProduct, updateProduct } from '../../api/products.js';

const EMPTY = {
  name: '', description: '', hsnCode: '', uom: UOM_OPTIONS[0], taxPercentage: TAX_RATE_OPTIONS[0],
  paymentTerm: '', purchasePrice: '', salesPrice: '',
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      getProduct(id).then((res) => setForm({
        ...EMPTY, ...res.data,
        paymentTerm: res.data.paymentTerm || '',
        hsnCode: res.data.hsnCode || '',
      })).catch((err) => setError(err.message));
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Product name is required.';
    if (form.purchasePrice === '' || Number(form.purchasePrice) < 0) errors.purchasePrice = 'Purchase price must be zero or greater.';
    if (form.salesPrice === '' || Number(form.salesPrice) < 0) errors.salesPrice = 'Sales price must be zero or greater.';
    if (form.hsnCode && !HSN_CODE_REGEX.test(form.hsnCode)) errors.hsnCode = 'HSN Code must be 4, 6, or 8 digits.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        taxPercentage: Number(form.taxPercentage),
        purchasePrice: Number(form.purchasePrice),
        salesPrice: Number(form.salesPrice),
        paymentTerm: form.paymentTerm || null,
        hsnCode: form.hsnCode || null,
      };
      if (isEdit) await updateProduct(id, payload);
      else await createProduct(payload);
      navigate('/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>Product Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} />
            {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
          </div>
          <div className="form-field">
            <label>Description</label>
            <input value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="form-field">
            <label>HSN Code</label>
            <input
              value={form.hsnCode || ''}
              maxLength={8}
              placeholder="4, 6, or 8 digits"
              onChange={(e) => set('hsnCode', e.target.value.replace(/\D/g, ''))}
            />
            {fieldErrors.hsnCode && <span className="error">{fieldErrors.hsnCode}</span>}
          </div>
          <div className="form-field">
            <label>UOM *</label>
            <select value={form.uom} onChange={(e) => set('uom', e.target.value)}>
              {UOM_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Tax % *</label>
            <select value={form.taxPercentage} onChange={(e) => set('taxPercentage', e.target.value)}>
              {TAX_RATE_OPTIONS.map((t) => <option key={t} value={t}>{t}%</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Payment Term</label>
            <select value={form.paymentTerm} onChange={(e) => set('paymentTerm', e.target.value)}>
              <option value="">None</option>
              {PAYMENT_TERM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Purchase Price *</label>
            <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
            {fieldErrors.purchasePrice && <span className="error">{fieldErrors.purchasePrice}</span>}
          </div>
          <div className="form-field">
            <label>Sales Price *</label>
            <input type="number" min="0" step="0.01" value={form.salesPrice} onChange={(e) => set('salesPrice', e.target.value)} />
            {fieldErrors.salesPrice && <span className="error">{fieldErrors.salesPrice}</span>}
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 18 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/products')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
