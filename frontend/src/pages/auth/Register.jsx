import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { INDIAN_STATES } from '@shared/constants.js';
import { useAuth } from '../../context/AuthContext.jsx';

const EMPTY = {
  email: '', password: '', confirmPassword: '',
  companyName: '', companyAddress: '', companyGstNumber: '', companyState: '', companyStateCode: '',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleStateChange(stateName) {
    set('companyState', stateName);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }
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
      await register({
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        companyName: form.companyName.trim(),
        companyAddress: form.companyAddress.trim(),
        companyGstNumber: form.companyGstNumber.trim() || null,
        companyState: form.companyState,
        companyStateCode: form.companyStateCode,
      });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card auth-card-wide" onSubmit={handleSubmit}>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Register your company to start using Sales &amp; Purchase Management</p>

        {error && <div className="alert alert-error">{error}</div>}

        <h3 className="auth-section-heading">Account</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>Email *</label>
            <input type="email" autoComplete="username" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Password *</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>At least 8 characters.</span>
          </div>
          <div className="form-field">
            <label>Confirm Password *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              required
            />
          </div>
        </div>

        <h3 className="auth-section-heading">Company</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>Company Name *</label>
            <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required />
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Company Address *</label>
            <textarea rows={2} value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} required />
          </div>
          <div className="form-field">
            <label>GST Number</label>
            <input value={form.companyGstNumber} maxLength={15} onChange={(e) => set('companyGstNumber', e.target.value.toUpperCase())} />
          </div>
          <div className="form-field">
            <label>State *</label>
            <select value={form.companyState} onChange={(e) => handleStateChange(e.target.value)} required>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>State Code *</label>
            <input
              value={form.companyStateCode}
              maxLength={2}
              placeholder="e.g. 33"
              onChange={(e) => set('companyStateCode', e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', marginTop: 16 }}>
          {saving ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="auth-footer-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
