import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../utils/formatters.js';
import { USER_ROLES, DEPARTMENTS, PERMISSION_MODULES } from '../utils/constants.js';

const ACTIONS = ['view', 'create', 'edit', 'delete'];

const getRoleInfo = (value) => USER_ROLES.find((r) => r.value === value) || { label: value, color: '#888' };

// ── Permission Matrix Component ────────────────────────────────────────────────
function PermissionMatrix({ permissions, onChange }) {
  const toggle = (moduleKey, action) => {
    const current = permissions[moduleKey] || {};
    const updated = { ...current, [action]: !current[action] };
    // If disabling view, disable everything
    if (action === 'view' && !updated.view) {
      onChange({ ...permissions, [moduleKey]: { view: false, create: false, edit: false, delete: false } });
    } else {
      // If enabling create/edit/delete, auto-enable view
      if (action !== 'view' && updated[action]) updated.view = true;
      onChange({ ...permissions, [moduleKey]: updated });
    }
  };

  const toggleAll = (moduleKey, enable) => {
    onChange({
      ...permissions,
      [moduleKey]: { view: enable, create: enable, edit: enable, delete: enable },
    });
  };

  const toggleSection = (modules, enable) => {
    const updated = { ...permissions };
    modules.forEach(({ key }) => {
      updated[key] = { view: enable, create: enable, edit: enable, delete: enable };
    });
    onChange(updated);
  };

  return (
    <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
      {PERMISSION_MODULES.map(({ section, modules }) => (
        <div key={section} style={{ marginBottom: 16 }}>
          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#0D3B5E', color: 'white', padding: '6px 10px',
            borderRadius: 6, marginBottom: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
          }}>
            <span>{section}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => toggleSection(modules, true)} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                fontSize: 10, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
              }}>All On</button>
              <button type="button" onClick={() => toggleSection(modules, false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)',
                fontSize: 10, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
              }}>All Off</button>
            </div>
          </div>

          {/* Module rows */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#555', fontWeight: 600, width: '40%' }}>Module</th>
                {ACTIONS.map((a) => (
                  <th key={a} style={{ padding: '4px 8px', textAlign: 'center', color: '#555', fontWeight: 600, textTransform: 'capitalize', width: '15%' }}>{a}</th>
                ))}
                <th style={{ padding: '4px 8px', textAlign: 'center', width: '10%', color: '#555' }}>Full</th>
              </tr>
            </thead>
            <tbody>
              {modules.map(({ key, label }) => {
                const perms = permissions[key] || {};
                const allOn = ACTIONS.every((a) => perms[a]);
                return (
                  <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 500, color: '#2c3e50' }}>{label}</td>
                    {ACTIONS.map((action) => (
                      <td key={action} style={{ padding: '5px 8px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!perms[action]}
                          onChange={() => toggle(key, action)}
                          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#0D3B5E' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allOn}
                        onChange={() => toggleAll(key, !allOn)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#f5a623' }}
                        title="Toggle all permissions"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ── User Modal ─────────────────────────────────────────────────────────────────
function UserModal({ show, onClose, onSave, onResetPassword, initial }) {
  const defaultPerms = {};
  PERMISSION_MODULES.forEach(({ modules }) => modules.forEach(({ key }) => {
    defaultPerms[key] = { view: false, create: false, edit: false, delete: false };
  }));

  const empty = { name: '', email: '', password: '', role: 'staff', department: 'Sales', status: 'active' };
  const [form, setForm] = useState(empty);
  const [permissions, setPermissions] = useState(defaultPerms);
  const [tab, setTab] = useState('info');
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [resetPwd, setResetPwd] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [createEmployee, setCreateEmployee] = useState(true); // Also create employee profile
  const [empDesignation, setEmpDesignation] = useState('');
  const [empDateJoin, setEmpDateJoin] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({ ...empty, ...initial, password: '' });
      setPermissions({ ...defaultPerms, ...(initial.permissions || {}) });
    } else {
      setForm(empty);
      setPermissions(defaultPerms);
    }
    setTab('info');
    setResetPwd('');
    setShowResetPwd(false);
    setCreateEmployee(!initial?.id); // only for new users
    setEmpDesignation('');
    setEmpDateJoin('');
  }, [initial, show]);

  if (!show) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRoleChange = async (e) => {
    const role = e.target.value;
    setForm((f) => ({ ...f, role }));
    // Auto-load preset for this role
    setLoadingPreset(true);
    try {
      const res = await api.get(`/api/users/role-preset/${role}`);
      setPermissions({ ...defaultPerms, ...res.data.permissions });
    } catch { /* keep existing */ }
    finally { setLoadingPreset(false); }
  };

  const roleInfo = getRoleInfo(form.role);

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">
              {initial?.id ? 'Edit User' : 'Add New User'}
              {initial?.id && (
                <span style={{
                  marginLeft: 10, padding: '2px 8px', borderRadius: 4,
                  background: `${roleInfo.color}20`, color: roleInfo.color,
                  fontSize: 12, fontWeight: 700,
                }}>{roleInfo.label}</span>
              )}
            </h5>
            <button className="btn-close" onClick={onClose} />
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '2px solid #eee', display: 'flex', gap: 0 }}>
            {[
              { key: 'info', label: 'Basic Info', icon: 'bi-person' },
              { key: 'permissions', label: 'Module Permissions', icon: 'bi-shield-lock' },
              ...(initial?.id ? [{ key: 'security', label: 'Security', icon: 'bi-key' }] : []),
            ].map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
                padding: '10px 20px', border: 'none', background: 'transparent',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                borderBottom: tab === t.key ? '2px solid #0D3B5E' : '2px solid transparent',
                color: tab === t.key ? '#0D3B5E' : '#888',
                marginBottom: -2,
              }}>
                <i className={`bi ${t.icon} me-1`} />{t.label}
              </button>
            ))}
          </div>

          <div className="modal-body">
            {/* ── Basic Info Tab ── */}
            {tab === 'info' && (
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Full Name *</label>
                  <input className="form-control" value={form.name} onChange={set('name')} placeholder="e.g. Ravi Kumar" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Email *</label>
                  <input type="email" className="form-control" value={form.email} onChange={set('email')} placeholder="user@company.com" />
                </div>
                {!initial?.id && (
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Password *</label>
                    <input type="password" className="form-control" value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
                  </div>
                )}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Role *</label>
                  <select className="form-select" value={form.role} onChange={handleRoleChange}>
                    {USER_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {loadingPreset && <small className="text-muted">Loading permissions preset...</small>}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Department</label>
                  <select className="form-select" value={form.department} onChange={set('department')}>
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Status</label>
                  <select className="form-select" value={form.status} onChange={set('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Role description card */}
                <div className="col-12">
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: `${roleInfo.color}10`,
                    border: `1px solid ${roleInfo.color}30`,
                  }}>
                    <div style={{ fontWeight: 700, color: roleInfo.color, fontSize: 13 }}>
                      <i className="bi bi-info-circle me-1" />{roleInfo.label} — Access Level
                    </div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                      {form.role === 'admin' && 'Full access to all modules, settings, and user management.'}
                      {form.role === 'sales_manager' && 'Full access to Sales & CRM. View-only for Operations and Finance. No HR or Admin access.'}
                      {form.role === 'operations_manager' && 'Full access to Operations modules. View Bookings & Finance. No Finance or HR access.'}
                      {form.role === 'finance_manager' && 'Full access to all Finance modules. View-only for Sales & HR. No Operations access.'}
                      {form.role === 'hr_manager' && 'Full access to HR, Customers, and Expenses. View-only for Sales. No Finance access.'}
                      {form.role === 'staff' && 'Limited access — can view and create in assigned modules. No delete or admin access.'}
                    </div>
                  </div>
                </div>

                {/* Employee Profile Section — only for new users */}
                {!initial?.id && (
                  <div className="col-12">
                    <div style={{
                      padding: '12px 16px', borderRadius: 8,
                      background: createEmployee ? '#f0fdf4' : '#f8f9fa',
                      border: `1px solid ${createEmployee ? '#86efac' : '#dee2e6'}`,
                    }}>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="createEmpCheck"
                          checked={createEmployee}
                          onChange={(e) => setCreateEmployee(e.target.checked)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#27ae60' }}
                        />
                        <label htmlFor="createEmpCheck" style={{ fontWeight: 700, fontSize: 13, color: createEmployee ? '#166534' : '#555', cursor: 'pointer', margin: 0 }}>
                          <i className="bi bi-person-badge me-1" />Also create Employee Profile in HR module
                        </label>
                      </div>
                      {createEmployee && (
                        <div className="row g-2 mt-1">
                          <div className="col-md-6">
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Designation</label>
                            <input className="form-control form-control-sm" value={empDesignation}
                              onChange={(e) => setEmpDesignation(e.target.value)}
                              placeholder="e.g. Sales Executive, Tour Manager" />
                          </div>
                          <div className="col-md-6">
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Date of Joining</label>
                            <input type="date" className="form-control form-control-sm" value={empDateJoin}
                              onChange={(e) => setEmpDateJoin(e.target.value)} />
                          </div>
                          <div className="col-12">
                            <div style={{ fontSize: 11, color: '#166534' }}>
                              <i className="bi bi-check-circle me-1" />
                              This will create an employee record with name "{form.name || '—'}", department "{form.department}", and link them to this user account. They will appear in staff dropdowns across the CRM.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Permissions Tab ── */}
            {tab === 'permissions' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#555' }}>
                    <i className="bi bi-info-circle me-1 text-primary" />
                    Customize access per module. Changes override the role default.
                  </div>
                  <button type="button" onClick={handleRoleChange.bind(null, { target: { value: form.role } })}
                    style={{
                      padding: '4px 12px', fontSize: 12, fontWeight: 600,
                      background: '#0D3B5E', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer',
                    }}>
                    <i className="bi bi-arrow-counterclockwise me-1" />Reset to Role Default
                  </button>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 11, color: '#888' }}>
                  {['view', 'create', 'edit', 'delete'].map((a) => (
                    <span key={a}><i className="bi bi-check-square me-1" style={{ color: '#0D3B5E' }} />{a}</span>
                  ))}
                  <span><i className="bi bi-check-square-fill me-1" style={{ color: '#f5a623' }} />full access (all 4)</span>
                </div>

                <PermissionMatrix permissions={permissions} onChange={setPermissions} />
              </div>
            )}

            {/* ── Security Tab ── */}
            {tab === 'security' && initial?.id && (
              <div>
                <div style={{
                  padding: 16, borderRadius: 8, background: '#fff8e1',
                  border: '1px solid #f5a62340', marginBottom: 16,
                }}>
                  <div style={{ fontWeight: 700, color: '#b7791f', marginBottom: 6 }}>
                    <i className="bi bi-exclamation-triangle me-1" />Reset User Password
                  </div>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
                    Admin can reset any user's password directly. The user will be required to use the new password on next login.
                  </div>
                  <div className="input-group" style={{ maxWidth: 340 }}>
                    <input
                      type={showResetPwd ? 'text' : 'password'}
                      className="form-control"
                      placeholder="New password (min 6 chars)"
                      value={resetPwd}
                      onChange={(e) => setResetPwd(e.target.value)}
                    />
                    <button type="button" className="btn btn-outline-secondary"
                      onClick={() => setShowResetPwd((v) => !v)}>
                      <i className={`bi bi-eye${showResetPwd ? '-slash' : ''}`} />
                    </button>
                    <button type="button"
                      className="btn btn-warning"
                      onClick={() => onResetPassword(initial.id, resetPwd)}
                      disabled={resetPwd.length < 6}>
                      Reset
                    </button>
                  </div>
                </div>

                <div style={{ padding: 16, borderRadius: 8, background: '#f8f9fa', border: '1px solid #eee' }}>
                  <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: 8 }}>
                    <i className="bi bi-clock-history me-1" />Account Information
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                    <div><span style={{ color: '#888' }}>User ID:</span> <strong>#{initial.id}</strong></div>
                    <div><span style={{ color: '#888' }}>Created:</span> <strong>{formatDate(initial.created_at)}</strong></div>
                    <div><span style={{ color: '#888' }}>Last Login:</span> <strong>{initial.last_login || 'Never'}</strong></div>
                    <div><span style={{ color: '#888' }}>Status:</span> <strong style={{ color: initial.status === 'active' ? '#27ae60' : '#e74c3c' }}>{initial.status}</strong></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form, permissions, createEmployee && !initial?.id ? { designation: empDesignation, date_of_join: empDateJoin } : null)}>
              <i className="bi bi-check-lg me-1" />
              {initial?.id ? 'Update User' : (createEmployee ? 'Create User & Employee' : 'Create User')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main IAM Page ──────────────────────────────────────────────────────────────
export default function IAM() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/api/users/list');
      setUsers(res.data.users || []);
    } catch { showToast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = async (form, permissions, employeeData) => {
    try {
      const payload = { ...form, permissions };
      if (editItem?.id) {
        await api.post(`/api/users/update/${editItem.id}`, payload);
        showToast('User updated successfully', 'success');
      } else {
        await api.post('/api/users/add', payload);
        showToast('User created successfully', 'success');

        // Also create employee profile if requested
        if (employeeData) {
          try {
            await api.post('/api/employees/add', {
              name: form.name,
              email: form.email,
              phone: '',
              department: form.department || 'Sales',
              designation: employeeData.designation || '',
              date_of_join: employeeData.date_of_join || '',
              status: 'Active',
            });
            showToast('Employee profile also created in HR', 'success');
          } catch (empErr) {
            showToast('User created but employee profile failed: ' + (empErr?.response?.data?.error || empErr.message), 'warning');
          }
        }
      }
      setModalShow(false); setEditItem(null); fetchUsers();
    } catch (err) { showToast(err?.response?.data?.error || err.message || 'Save failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/users/get/${id}`);
      setEditItem(res.data.user); setModalShow(true);
    } catch { showToast('Failed to load user', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.post(`/api/users/delete/${id}`);
      showToast('User deleted', 'success'); fetchUsers();
    } catch (err) { showToast(err.message || 'Delete failed', 'error'); }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await api.post(`/api/users/update/${id}`, { status: newStatus });
      showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
      fetchUsers();
    } catch { showToast('Failed', 'error'); }
  };

  const handleResetPassword = async (id, newPassword) => {
    try {
      await api.post(`/api/users/reset-password/${id}`, { new_password: newPassword });
      showToast('Password reset successfully', 'success');
    } catch (err) { showToast(err.message || 'Reset failed', 'error'); }
  };

  const filtered = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.department?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">User Access Management</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-person-plus" /> Add User
        </button>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="kpi-card"><div className="kpi-label">Total Users</div><div className="kpi-value">{users.length}</div></div>
        </div>
        {USER_ROLES.slice(0, 3).map((r) => (
          <div className="col-6 col-md-3" key={r.value}>
            <div className="kpi-card">
              <div className="kpi-label">{r.label}s</div>
              <div className="kpi-value" style={{ color: r.color }}>
                {users.filter((u) => u.role === r.value).length}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Second row KPI */}
      <div className="row g-3 mb-3">
        {USER_ROLES.slice(3).map((r) => (
          <div className="col-6 col-md-3" key={r.value}>
            <div className="kpi-card">
              <div className="kpi-label">{r.label}s</div>
              <div className="kpi-value" style={{ color: r.color }}>
                {users.filter((u) => u.role === r.value).length}
              </div>
            </div>
          </div>
        ))}
        <div className="col-6 col-md-3">
          <div className="kpi-card success">
            <div className="kpi-label">Active Users</div>
            <div className="kpi-value">{users.filter((u) => u.status === 'active').length}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="kpi-card danger">
            <div className="kpi-label">Inactive</div>
            <div className="kpi-value">{users.filter((u) => u.status === 'inactive').length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input type="text" placeholder="Search name, email, department..." value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchUsers}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      {/* Table */}
      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Module Access</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">No users found.</td></tr>
                ) : filtered.map((u) => {
                  const roleInfo = getRoleInfo(u.role);
                  const perms = u.permissions || {};
                  const accessCount = Object.values(perms).filter((p) => p && p.view).length;
                  const totalModules = PERMISSION_MODULES.reduce((s, g) => s + g.modules.length, 0);

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: roleInfo.color, color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 13, flexShrink: 0,
                          }}>
                            {u.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: '#888' }}>#{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{u.email}</td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: `${roleInfo.color}18`, color: roleInfo.color,
                          border: `1px solid ${roleInfo.color}30`,
                          whiteSpace: 'nowrap',
                        }}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{u.department}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            height: 6, borderRadius: 3, background: '#eee', flex: 1, minWidth: 60,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 3,
                              background: accessCount === totalModules ? '#27ae60' : accessCount > totalModules / 2 ? '#f5a623' : '#3498db',
                              width: `${(accessCount / totalModules) * 100}%`,
                            }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>
                            {accessCount}/{totalModules}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: '#888' }}>{u.last_login || '—'}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: u.status === 'active' ? '#27ae6020' : '#e74c3c20',
                          color: u.status === 'active' ? '#27ae60' : '#e74c3c',
                        }}>
                          {u.status === 'active' ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-act edit" onClick={() => handleEdit(u.id)} title="Edit User & Permissions">
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className={`btn-act ${u.status === 'active' ? '' : 'done'}`}
                          onClick={() => handleToggle(u.id, u.status)}
                          title={u.status === 'active' ? 'Deactivate User' : 'Activate User'}
                          style={{ background: u.status === 'active' ? '#fff3cd' : '#d4edda', color: u.status === 'active' ? '#856404' : '#155724' }}
                        >
                          <i className={`bi bi-person-${u.status === 'active' ? 'dash' : 'check'}`} />
                        </button>
                        <button className="btn-act del" onClick={() => handleDelete(u.id)} title="Delete User">
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserModal
        show={modalShow}
        onClose={() => { setModalShow(false); setEditItem(null); }}
        onSave={handleSave}
        onResetPassword={handleResetPassword}
        initial={editItem}
      />
    </div>
  );
}
