import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      showToast('Welcome back! Login successful.', 'success');
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1><span>SST</span> Tours & Travels</h1>
          <p>Enterprise Resource Planning System v3.0</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2" style={{ fontSize: '13px' }}>
              <i className="bi bi-exclamation-triangle-fill" />
              {error}
            </div>
          )}

          <div className="mb-3">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', color: '#555' }}>
              Email Address
            </label>
            <div className="input-group">
              <span className="input-group-text" style={{ background: '#f8f9fa' }}>
                <i className="bi bi-envelope" style={{ color: '#0D3B5E' }} />
              </span>
              <input
                type="email"
                className="form-control"
                placeholder="admin@ssttours.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', color: '#555' }}>
              Password
            </label>
            <div className="input-group">
              <span className="input-group-text" style={{ background: '#f8f9fa' }}>
                <i className="bi bi-lock" style={{ color: '#0D3B5E' }} />
              </span>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn w-100 py-2"
            disabled={loading}
            style={{ background: '#0D3B5E', color: 'white', fontWeight: 700, fontSize: '14px', borderRadius: '8px' }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Signing In...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2" />
                Sign In to ERP
              </>
            )}
          </button>

          <div className="text-center mt-3" style={{ fontSize: '12px', color: '#888' }}>
            <i className="bi bi-shield-lock me-1" />
            Secured login for authorized personnel only
          </div>
        </form>

        <div
          className="mt-4 p-3 rounded"
          style={{ background: '#f8f9fa', fontSize: '12px', color: '#555', borderLeft: '3px solid #f5a623' }}
        >
          <strong>Demo Credentials:</strong><br />
          Email: admin@ssttours.com<br />
          Password: admin123
        </div>
      </div>
    </div>
  );
}
