import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Sign In</h1>
        <p className="auth-subtitle">Sales &amp; Purchase Management</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-field">
          <label>Email</label>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-field">
          <label>Password</label>
          <div className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <Link to="/forgot-password" style={{ fontSize: '0.82rem' }}>Forgot Password?</Link>
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
          {saving ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="auth-footer-link">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
