import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';

function CommModal({ show, onClose, onSave, initial, employees }) {
  const empty = { staff_name: '', booking_ref: '', client: '', booking_amount: '', commission_rate: 5, commission_amount: '', month: '', status: 'Pending', paid_date: '' };
  const [form, setForm] = useState(empty);
  useEffect(() => {
    if (initial) setForm({ ...empty, ...initial });
    else setForm(empty);
  }, [initial, show]);
  if (!show) return null;
  const set = (k) => (e) => setForm((f) => {
    const updated = { ...f, [k]: e.target.value };
    if (k === 'booking_amount' || k === 'commission_rate') {
      const amt = parseFloat(updated.booking_amount) || 0;
      const rate = parseFloat(updated.commission_rate) || 0;
      updated.commission_amount = ((amt * rate) / 100).toFixed(2);
    }
    return updated;
  });

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">{initial?.id ? 'Edit Commission' : 'Add Commission'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Staff Name *</label>
                {employees?.length > 0 ? (
                  <select className="form-select" value={form.staff_name} onChange={set('staff_name')}>
                    <option value="">— Select Staff —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input className="form-control" value={form.staff_name} onChange={set('staff_name')} placeholder="Staff name" />
                )}
              </div>
              <div className="col-md-6"><label className="form-label">Booking Ref</label><input className="form-control" value={form.booking_ref} onChange={set('booking_ref')} /></div>
              <div className="col-md-6"><label className="form-label">Client</label><input className="form-control" value={form.client} onChange={set('client')} /></div>
              <div className="col-md-6"><label className="form-label">Month</label><input className="form-control" value={form.month} onChange={set('month')} placeholder="March 2026" /></div>
              <div className="col-md-4"><label className="form-label">Booking Amount (₹)</label><input type="number" className="form-control" value={form.booking_amount} onChange={set('booking_amount')} /></div>
              <div className="col-md-4"><label className="form-label">Commission Rate (%)</label><input type="number" className="form-control" value={form.commission_rate} onChange={set('commission_rate')} /></div>
              <div className="col-md-4">
                <label className="form-label">Commission Amount (₹)</label>
                <input type="number" className="form-control" value={form.commission_amount} onChange={set('commission_amount')} style={{ background: '#f8f9fa' }} readOnly />
              </div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {['Pending', 'Paid'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-md-4"><label className="form-label">Paid Date</label><input type="date" className="form-control" value={form.paid_date} onChange={set('paid_date')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Add Commission'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Commissions() {
  const { showToast } = useToast();
  const [commissions, setCommissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStaff, setFilterStaff] = useState('');

  const fetchCommissions = useCallback(async () => {
    try {
      const res = await api.get('/api/commissions/list');
      setCommissions(res.data.commissions || []);
    } catch { showToast('Failed to load commissions', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);
  useEffect(() => {
    api.get('/api/employees/staff').then((r) => setEmployees(r.data.employees || [])).catch(() => {});
  }, []);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/commissions/update/${editItem.id}`, form);
        showToast('Updated', 'success');
      } else {
        await api.post('/api/commissions/add', form);
        showToast('Commission added', 'success');
      }
      setModalShow(false); setEditItem(null); fetchCommissions();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this commission record?')) return;
    try {
      await api.post(`/api/commissions/delete/${id}`);
      showToast('Deleted', 'success'); fetchCommissions();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/commissions/get/${id}`);
      setEditItem(res.data.commission); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const staffList = employees.length > 0 ? employees.map((e) => e.name) : [...new Set(commissions.map((c) => c.staff_name).filter(Boolean))];
  const filtered = commissions.filter((c) => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterStaff && c.staff_name !== filterStaff) return false;
    return true;
  });

  const totalComm = commissions.reduce((s, c) => s + (parseFloat(c.commission_amount) || 0), 0);
  const paidComm = commissions.filter((c) => c.status === 'Paid').reduce((s, c) => s + (parseFloat(c.commission_amount) || 0), 0);
  const pendingComm = commissions.filter((c) => c.status === 'Pending').reduce((s, c) => s + (parseFloat(c.commission_amount) || 0), 0);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Commission & Incentives</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> Add Commission
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Commission', value: formatCurrency(totalComm), cls: '' },
          { label: 'Paid', value: formatCurrency(paidComm), cls: 'success' },
          { label: 'Pending', value: formatCurrency(pendingComm), cls: 'warning' },
          { label: 'Records', value: commissions.length, cls: 'info' },
        ].map((k) => (
          <div className="col-6 col-md-3" key={k.label}>
            <div className={`kpi-card ${k.cls}`}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {['Pending', 'Paid'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}>
          <option value="">All Staff</option>
          {staffList.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchCommissions}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr><th>Comm #</th><th>Staff</th><th>Booking Ref</th><th>Client</th><th>Booking Amt</th><th>Rate</th><th>Commission</th><th>Month</th><th>Paid Date</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-muted">No commission records.</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{c.commission_no}</td>
                    <td style={{ fontWeight: 600 }}>{c.staff_name}</td>
                    <td>{c.booking_ref}</td>
                    <td>{c.client}</td>
                    <td>{formatCurrency(c.booking_amount)}</td>
                    <td>{c.commission_rate}%</td>
                    <td style={{ fontWeight: 700, color: '#27ae60' }}>{formatCurrency(c.commission_amount)}</td>
                    <td>{c.month}</td>
                    <td>{formatDate(c.paid_date)}</td>
                    <td><span className={getStatusBadgeClass(c.status)}>{c.status}</span></td>
                    <td>
                      <button className="btn-act edit" onClick={() => handleEdit(c.id)}><i className="bi bi-pencil" /></button>
                      <button className="btn-act del" onClick={() => handleDelete(c.id)}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CommModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} employees={employees} />
    </div>
  );
}
