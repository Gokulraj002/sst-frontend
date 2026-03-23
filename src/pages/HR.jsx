import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, getStatusBadgeClass } from '../utils/formatters.js';
import { DEPARTMENTS } from '../utils/constants.js';

const EMP_STATUSES = ['Active', 'On Leave', 'Inactive'];

function EmpModal({ show, onClose, onSave, initial }) {
  const empty = { name: '', designation: '', department: 'Sales', phone: '', email: '', salary: '', date_of_join: '', status: 'Active', notes: '' };
  const [form, setForm] = useState(empty);
  useEffect(() => {
    if (initial) setForm({ ...empty, ...initial });
    else setForm(empty);
  }, [initial, show]);
  if (!show) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">{initial?.id ? 'Edit Employee' : 'Add Employee'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Full Name *</label><input className="form-control" value={form.name} onChange={set('name')} /></div>
              <div className="col-md-6"><label className="form-label">Designation</label><input className="form-control" value={form.designation} onChange={set('designation')} /></div>
              <div className="col-md-4">
                <label className="form-label">Department</label>
                <select className="form-select" value={form.department} onChange={set('department')}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-md-4"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={set('phone')} /></div>
              <div className="col-md-4"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={set('email')} /></div>
              <div className="col-md-4"><label className="form-label">Salary (₹)</label><input type="number" className="form-control" value={form.salary} onChange={set('salary')} /></div>
              <div className="col-md-4"><label className="form-label">Date of Joining</label><input type="date" className="form-control" value={form.date_of_join ? String(form.date_of_join).split('T')[0] : ''} onChange={set('date_of_join')} /></div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {EMP_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes || ''} onChange={set('notes')} placeholder="Skills, certifications, additional notes..." /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Add Employee'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HR() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeTab, setActiveTab] = useState('employees');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/api/hr/list');
      setEmployees(res.data.employees || []);
    } catch { showToast('Failed to load employees', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/hr/update/${editItem.id}`, form);
        showToast('Employee updated', 'success');
      } else {
        await api.post('/api/hr/add', form);
        showToast('Employee added', 'success');
      }
      setModalShow(false); setEditItem(null); fetchEmployees();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove employee "${name}"?`)) return;
    try {
      await api.post(`/api/hr/delete/${id}`);
      showToast('Removed', 'success'); fetchEmployees();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/hr/get/${id}`);
      setEditItem(res.data.employee); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const active = employees.filter((e) => e.status === 'Active').length;
  const onLeave = employees.filter((e) => e.status === 'On Leave').length;

  const filtered = employees.filter((e) => {
    if (filterDept && e.department !== filterDept) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return e.name?.toLowerCase().includes(s) || e.designation?.toLowerCase().includes(s) || e.email?.toLowerCase().includes(s) || e.phone?.includes(s);
    }
    return true;
  });

  // Group by department
  const byDept = employees.reduce((acc, emp) => {
    const dept = emp.department || 'Other';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">HR & Payroll</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> Add Employee
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Staff', value: employees.length, cls: '' },
          { label: 'Active', value: active, cls: 'success' },
          { label: 'On Leave', value: onLeave, cls: 'warning' },
          { label: 'Departments', value: Object.keys(byDept).length, cls: 'info' },
        ].map((k) => (
          <div className="col-6 col-md-3" key={k.label}>
            <div className={`kpi-card ${k.cls}`}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tab-buttons mb-3">
        <button className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
          <i className="bi bi-people me-1" /> Employee Roster
        </button>
        <button className={`tab-btn ${activeTab === 'dept' ? 'active' : ''}`} onClick={() => setActiveTab('dept')}>
          <i className="bi bi-diagram-3 me-1" /> By Department
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input type="text" placeholder="Search name, designation, email, phone..." value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 240 }} />
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {EMP_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <span style={{ fontSize: 12, color: '#888' }}>{filtered.length} of {employees.length} employees</span>
        <button className="btn-act done" onClick={fetchEmployees}><i className="bi bi-arrow-clockwise" /></button>
      </div>

      {/* Info Banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#1e40af' }}>
        <i className="bi bi-info-circle me-2" />
        <strong>Tip:</strong> Active employees appear in staff dropdowns across Leads, Bookings, Commissions, and other modules.
        To give an employee system login access, go to <Link to="/iam" style={{ color: '#0D3B5E', fontWeight: 700 }}>User Access Management</Link> and create a user — you can also create the employee profile there in one step.
      </div>

      {activeTab === 'employees' ? (
        <div className="s-card">
          {loading ? (
            <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
          ) : (
            <div className="table-wrapper">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Emp #</th><th>Name</th><th>Designation</th><th>Department</th>
                    <th>Phone</th><th>Email</th><th>Salary</th><th>Date of Joining</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-4 text-muted">
                      {employees.length === 0 ? 'No employees yet. Add your first employee.' : 'No employees match your filters.'}
                    </td></tr>
                  ) : filtered.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{e.emp_no}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: e.status === 'Active' ? '#0D3B5E' : '#aaa',
                          color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '12px', marginRight: 8, flexShrink: 0,
                        }}>
                          {e.name?.[0] || 'E'}
                        </div>
                        {e.name}
                      </td>
                      <td style={{ color: '#555' }}>{e.designation || '—'}</td>
                      <td>
                        <span style={{ background: '#eef4fb', color: '#0D3B5E', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                          {e.department}
                        </span>
                      </td>
                      <td>{e.phone || '—'}</td>
                      <td style={{ fontSize: 12, color: '#555' }}>{e.email || '—'}</td>
                      <td style={{ fontWeight: 600, color: '#27ae60' }}>{e.salary ? `₹${Number(e.salary).toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.date_of_join)}</td>
                      <td><span className={getStatusBadgeClass(e.status)}>{e.status}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-act edit" title="Edit" onClick={() => handleEdit(e.id)}><i className="bi bi-pencil" /></button>
                        <button className="btn-act del" title="Delete" onClick={() => handleDelete(e.id, e.name)}><i className="bi bi-trash" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="row g-3">
          {Object.entries(byDept).map(([dept, count]) => (
            <div className="col-md-4" key={dept}>
              <div className="s-card">
                <div className="d-flex align-items-center gap-3">
                  <div style={{
                    width: 48, height: 48, borderRadius: '12px', background: '#0D3B5E20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <i className="bi bi-people" style={{ fontSize: '20px', color: '#0D3B5E' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#0D3B5E' }}>{count}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>{dept}</div>
                  </div>
                </div>
                <div className="mt-3">
                  {employees.filter((e) => e.department === dept).map((e) => (
                    <div key={e.id} style={{ fontSize: '12px', color: '#555', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <strong>{e.name}</strong> — {e.designation}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EmpModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} />
    </div>
  );
}
