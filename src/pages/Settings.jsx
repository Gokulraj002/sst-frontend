import React, { useState, useEffect } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState({ company_name: 'SST Tours & Travels', company_email: '', company_phone: '', company_address: '', gst_number: '', currency: 'INR', timezone: 'Asia/Kolkata', date_format: 'DD/MM/YYYY' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/api/settings/get');
        if (res.data?.settings) setSettings((s) => ({ ...s, ...res.data.settings }));
      } catch { /* ignore */ }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await api.post('/api/settings/save', settings);
      showToast('Settings saved successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      showToast('New passwords do not match', 'error'); return;
    }
    if (pwdForm.new_password.length < 6) {
      showToast('Password must be at least 6 characters', 'error'); return;
    }
    try {
      await api.post('/api/users/change-password', { current_password: pwdForm.current_password, new_password: pwdForm.new_password });
      showToast('Password changed successfully', 'success');
      setPwdForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { showToast(err.message || 'Failed to change password', 'error'); }
  };

  const set = (k) => (e) => setSettings((s) => ({ ...s, [k]: e.target.value }));
  const setPwd = (k) => (e) => setPwdForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Settings</h1>
      </div>

      <div className="tab-buttons mb-3">
        {[
          { key: 'company', label: 'Company', icon: 'bi-building' },
          { key: 'profile', label: 'My Profile', icon: 'bi-person-circle' },
          { key: 'security', label: 'Security', icon: 'bi-shield-lock' },
          { key: 'about', label: 'About', icon: 'bi-info-circle' },
        ].map((t) => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <i className={`bi ${t.icon} me-1`} />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && (
        <div className="s-card" style={{ maxWidth: 600 }}>
          <div className="s-card-title"><i className="bi bi-building" />Company Information</div>
          <div className="row g-3">
            <div className="col-12"><label className="form-label">Company Name</label><input className="form-control" value={settings.company_name} onChange={set('company_name')} /></div>
            <div className="col-md-6"><label className="form-label">Email</label><input type="email" className="form-control" value={settings.company_email} onChange={set('company_email')} /></div>
            <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={settings.company_phone} onChange={set('company_phone')} /></div>
            <div className="col-12"><label className="form-label">Address</label><textarea className="form-control" rows={2} value={settings.company_address} onChange={set('company_address')} /></div>
            <div className="col-md-6"><label className="form-label">GST Number</label><input className="form-control" value={settings.gst_number} onChange={set('gst_number')} /></div>
            <div className="col-md-6">
              <label className="form-label">Currency</label>
              <select className="form-select" value={settings.currency} onChange={set('currency')}>
                {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Timezone</label>
              <select className="form-select" value={settings.timezone} onChange={set('timezone')}>
                {['Asia/Kolkata', 'UTC', 'Asia/Dubai', 'America/New_York', 'Europe/London'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Date Format</label>
              <select className="form-select" value={settings.date_format} onChange={set('date_format')}>
                {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="col-12">
              <button className="btn btn-primary" onClick={handleSaveSettings} disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1" /> Saving...</> : <><i className="bi bi-check2 me-1" />Save Settings</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="s-card" style={{ maxWidth: 500 }}>
          <div className="s-card-title"><i className="bi bi-person-circle" />My Profile</div>
          <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded" style={{ background: '#f8f9fa' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', background: '#f5a623',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '24px',
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#0D3B5E' }}>{user?.name}</div>
              <div style={{ fontSize: '13px', color: '#888' }}>{user?.email}</div>
              <div style={{ fontSize: '12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#e2d9f3', color: '#8e44ad', fontWeight: 700, fontSize: '11px' }}>
                  {user?.role}
                </span>
                <span className="ms-2" style={{ color: '#888' }}>{user?.department}</span>
              </div>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label" style={{ color: '#888', fontWeight: 600, fontSize: '12px' }}>FULL NAME</label>
              <div style={{ fontWeight: 600, padding: '8px 0' }}>{user?.name}</div>
            </div>
            <div className="col-12">
              <label className="form-label" style={{ color: '#888', fontWeight: 600, fontSize: '12px' }}>EMAIL ADDRESS</label>
              <div style={{ fontWeight: 600, padding: '8px 0' }}>{user?.email}</div>
            </div>
            <div className="col-12">
              <label className="form-label" style={{ color: '#888', fontWeight: 600, fontSize: '12px' }}>ROLE & DEPARTMENT</label>
              <div style={{ fontWeight: 600, padding: '8px 0' }}>{user?.role} — {user?.department}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="s-card" style={{ maxWidth: 450 }}>
          <div className="s-card-title"><i className="bi bi-shield-lock" />Change Password</div>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-control" value={pwdForm.current_password} onChange={setPwd('current_password')} />
            </div>
            <div className="col-12">
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" value={pwdForm.new_password} onChange={setPwd('new_password')} placeholder="Min 6 characters" />
            </div>
            <div className="col-12">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-control" value={pwdForm.confirm_password} onChange={setPwd('confirm_password')} />
            </div>
            <div className="col-12">
              <button className="btn btn-primary" onClick={handleChangePassword}>
                <i className="bi bi-key me-1" />Change Password
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="s-card" style={{ maxWidth: 500 }}>
          <div className="s-card-title"><i className="bi bi-info-circle" />About SST ERP</div>
          <div className="text-center py-3">
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0D3B5E', marginBottom: '8px' }}>
              <span style={{ color: '#f5a623' }}>SST</span> ERP
            </div>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '16px' }}>SST Tours & Travels — Enterprise Resource Planning</div>
            <div className="row g-2 mt-2 text-left">
              {[
                { label: 'Version', value: '4.0.0 — Node.js Edition' },
                { label: 'Frontend', value: 'React 18 + Vite + Bootstrap 5' },
                { label: 'Backend', value: 'Node.js + Express.js' },
                { label: 'Database', value: 'PostgreSQL 15' },
                { label: 'Features', value: '25+ modules' },
              ].map((item) => (
                <div className="col-12" key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                    <span style={{ color: '#888', fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: '#0D3B5E' }}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
