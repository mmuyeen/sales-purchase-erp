import { useEffect, useState } from 'react';
import { INDIAN_STATES } from '@shared/constants.js';
import { getCompanyInfo } from '../../api/company.js';
import client from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const EMPTY = { companyName: '', companyAddress: '', companyGstNumber: '', companyState: '', companyStateCode: '' };

export default function CompanySettings() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyInfo()
      .then((res) => setForm({
        companyName: res.data.companyName || '',
        companyAddress: res.data.companyAddress || '',
        companyGstNumber: res.data.companyGstNumber || '',
        companyState: res.data.companyState || '',
        companyStateCode: res.data.companyStateCode || '',
      }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.companyName.trim() || !form.companyAddress.trim()) {
      return setError('Company name and address are required.');
    }
    if (!form.companyState) {
      return setError('Please select a state.');
    }
    if (!/^[0-9]{2}$/.test(form.companyStateCode)) {
      return setError('State code must be a 2-digit number (e.g. 33).');
    }

    setSaving(true);
    try {
      await client.put('/company', {
        companyName: form.companyName.trim(),
        companyAddress: form.companyAddress.trim(),
        companyGstNumber: form.companyGstNumber.trim() || null,
        companyState: form.companyState,
        companyStateCode: form.companyStateCode,
      });
      setSuccess('Company details saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header"><h1>Company Settings</h1></div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Account</h3>
        <div><strong>Login Email:</strong> {user?.email}</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Company</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>Company Name *</label>
            <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Company Address *</label>
            <textarea rows={2} value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} />
          </div>
          <div className="form-field">
            <label>GST Number</label>
            <input value={form.companyGstNumber} maxLength={15} onChange={(e) => set('companyGstNumber', e.target.value.toUpperCase())} />
          </div>
          <div className="form-field">
            <label>State *</label>
            <select value={form.companyState} onChange={(e) => set('companyState', e.target.value)}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>State Code *</label>
            <input value={form.companyStateCode} maxLength={2} onChange={(e) => set('companyStateCode', e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 18 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
