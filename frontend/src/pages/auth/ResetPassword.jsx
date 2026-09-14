import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { resetPassword } from '../../api/auth.js';

export default function ResetPassword() {
  const location = useLocation();
  const email = location.state?.email;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setSaving(true);
    try {
      await resetPassword({ email, newPassword, confirmPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setSaving(false);
    }
  }

  // No email in navigation state — either the page was opened/refreshed
  // directly rather than reached via Forgot Password, so the email hasn't
  // been verified in this flow yet. Send the user back to verify it again.
  if (!email) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Reset Password</h1>
          <div className="alert alert-error">Please verify your email address first.</div>
          <p className="auth-footer-link"><Link to="/forgot-password">Forgot Password</Link></p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Reset Password</h1>
          <div className="alert alert-success">Password reset successfully.</div>
          <Link className="btn btn-primary" to="/login" style={{ width: '100%', display: 'block', textAlign: 'center', marginTop: 8 }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Reset Password</h1>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-field">
          <label>Email</label>
          <input type="email" value={email} disabled />
        </div>

        <div className="form-field">
          <label>New Password</label>
          <div className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>At least 8 characters.</span>
        </div>
        <div className="form-field">
          <label>Confirm New Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
          {saving ? 'Saving...' : 'Save New Password'}
        </button>

        <p className="auth-footer-link"><Link to="/login">Back to Login</Link></p>
      </form>
    </div>
  );
}
