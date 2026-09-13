import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { INDIAN_STATES, PINCODE_REGEX, GST_NUMBER_REGEX } from '@shared/constants.js';
import { createCustomer, getCustomer, updateCustomer } from '../../api/customers.js';

const EMPTY = { name: '', address: '', state: '', city: '', pincode: '', gstNumber: '', phone: '', email: '' };

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      getCustomer(id).then((res) => setForm({ ...EMPTY, ...res.data })).catch((err) => setError(err.message));
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required.';
    if (!form.state) errors.state = 'State is required.';
    if (!form.city.trim()) errors.city = 'City is required.';
    if (!PINCODE_REGEX.test(form.pincode || '')) errors.pincode = 'Please enter a valid 6-digit pincode.';
    if (form.gstNumber && !GST_NUMBER_REGEX.test(form.gstNumber.toUpperCase())) errors.gstNumber = 'Please enter a valid GST number.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email address.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, gstNumber: form.gstNumber ? form.gstNumber.toUpperCase() : null };
      if (isEdit) await updateCustomer(id, payload);
      else await createCustomer(payload);
      navigate('/customers');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h1>{isEdit ? 'Edit Customer' : 'Add Customer'}</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>Customer Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} />
            {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
          </div>
          <div className="form-field">
            <label>Address</label>
            <input value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="form-field">
            <label>State *</label>
            <select value={form.state} onChange={(e) => set('state', e.target.value)}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {fieldErrors.state && <span className="error">{fieldErrors.state}</span>}
          </div>
          <div className="form-field">
            <label>City *</label>
            <input value={form.city} onChange={(e) => set('city', e.target.value)} />
            {fieldErrors.city && <span className="error">{fieldErrors.city}</span>}
          </div>
          <div className="form-field">
            <label>Pincode *</label>
            <input value={form.pincode} maxLength={6} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} />
            {fieldErrors.pincode && <span className="error">{fieldErrors.pincode}</span>}
          </div>
          <div className="form-field">
            <label>GST Number</label>
            <input value={form.gstNumber || ''} onChange={(e) => set('gstNumber', e.target.value.toUpperCase())} maxLength={15} />
            {fieldErrors.gstNumber && <span className="error">{fieldErrors.gstNumber}</span>}
          </div>
          <div className="form-field">
            <label>Phone</label>
            <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
            {fieldErrors.email && <span className="error">{fieldErrors.email}</span>}
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 18 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/customers')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
