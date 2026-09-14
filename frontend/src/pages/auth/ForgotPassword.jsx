import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../../api/auth.js';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await forgotPassword(email);
      navigate('/reset-password', { state: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(err.message || 'Email address not found.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-subtitle">Enter your registered email address.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-field">
          <label>Email</label>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
          {saving ? 'Checking...' : 'Continue'}
        </button>

        <p className="auth-footer-link"><Link to="/login">Back to Login</Link></p>
      </form>
    </div>
  );
}
