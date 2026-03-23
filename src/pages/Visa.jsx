import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, getStatusBadgeClass } from '../utils/formatters.js';
import { VISA_STATUSES } from '../utils/constants.js';

function VisaModal({ show, onClose, onSave, initial, employees }) {
  const empty = {
    client: '', booking_ref: '', destination: '', visa_type: '', pax: 1,
    passport_no: '', passport_expiry: '',
    applied_on: '', expected_by: '', handled_by: '', status: 'Docs Collecting', docs_status: 'Pending',
  };
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
            <h5 className="modal-title">{initial?.id ? 'Edit Visa Application' : 'New Visa Application'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Client *</label><input className="form-control" value={form.client} onChange={set('client')} /></div>
              <div className="col-md-3"><label className="form-label">Booking Ref</label><input className="form-control" value={form.booking_ref} onChange={set('booking_ref')} /></div>
              <div className="col-md-3"><label className="form-label">Pax</label><input type="number" className="form-control" value={form.pax} min={1} onChange={set('pax')} /></div>
              <div className="col-md-6"><label className="form-label">Destination</label><input className="form-control" value={form.destination} onChange={set('destination')} /></div>
              <div className="col-md-6"><label className="form-label">Visa Type</label><input className="form-control" value={form.visa_type} onChange={set('visa_type')} placeholder="Tourist, Business, etc." /></div>
              <div className="col-md-6"><label className="form-label">Passport No</label><input className="form-control" value={form.passport_no} onChange={set('passport_no')} /></div>
              <div className="col-md-6"><label className="form-label">Passport Expiry</label><input type="date" className="form-control" value={form.passport_expiry} onChange={set('passport_expiry')} /></div>
              <div className="col-md-4"><label className="form-label">Applied On</label><input type="date" className="form-control" value={form.applied_on} onChange={set('applied_on')} /></div>
              <div className="col-md-4"><label className="form-label">Expected By</label><input type="date" className="form-control" value={form.expected_by} onChange={set('expected_by')} /></div>
              <div className="col-md-4">
                <label className="form-label">Handled By</label>
                {employees?.length > 0 ? (
                  <select className="form-select" value={form.handled_by} onChange={set('handled_by')}>
                    <option value="">— Select Staff —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input className="form-control" value={form.handled_by} onChange={set('handled_by')} placeholder="Staff name" />
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {VISA_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Docs Status</label>
                <select className="form-select" value={form.docs_status} onChange={set('docs_status')}>
                  {['Pending', 'Complete', 'N/A'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Add Application'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Visa() {
  const { showToast } = useToast();
  const [visas, setVisas] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchVisas = useCallback(async () => {
    try {
      const res = await api.get('/api/visa/list');
      setVisas(res.data.visas || []);
    } catch { showToast('Failed to load visa data', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVisas(); }, [fetchVisas]);
  useEffect(() => {
    api.get('/api/employees/staff').then((r) => setEmployees(r.data.employees || [])).catch(() => {});
  }, []);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/visa/update/${editItem.id}`, form);
        showToast('Visa record updated', 'success');
      } else {
        await api.post('/api/visa/add', form);
        showToast('Visa application added', 'success');
      }
      setModalShow(false); setEditItem(null); fetchVisas();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this visa application?')) return;
    try {
      await api.post(`/api/visa/delete/${id}`);
      showToast('Deleted', 'success'); fetchVisas();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/visa/get/${id}`);
      setEditItem(res.data.visa); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const filtered = visas.filter((v) => {
    if (filterStatus && v.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return v.client?.toLowerCase().includes(s) || v.destination?.toLowerCase().includes(s) || v.passport_no?.toLowerCase().includes(s);
    }
    return true;
  });

  const approved = visas.filter((v) => v.status === 'Approved').length;
  const inProcess = visas.filter((v) => v.status === 'In Process').length;
  const docsCollecting = visas.filter((v) => v.status === 'Docs Collecting').length;

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Visa Tracker</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Application
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Applications', value: visas.length, cls: '' },
          { label: 'Approved', value: approved, cls: 'success' },
          { label: 'In Process', value: inProcess, cls: 'warning' },
          { label: 'Docs Collecting', value: docsCollecting, cls: 'info' },
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
        <input type="text" placeholder="Search client, destination, passport..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {VISA_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchVisas}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Visa #</th><th>Client</th><th>Booking Ref</th><th>Destination</th>
                  <th>Visa Type</th><th>Pax</th><th>Passport No</th><th>Passport Expiry</th>
                  <th>Applied</th><th>Expected By</th><th>Handled By</th><th>Docs</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-4 text-muted">No visa applications.</td></tr>
                ) : filtered.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{v.visa_no}</td>
                    <td style={{ fontWeight: 600 }}>{v.client}</td>
                    <td>{v.booking_ref}</td>
                    <td>{v.destination}</td>
                    <td>{v.visa_type}</td>
                    <td>{v.pax}</td>
                    <td>{v.passport_no || '—'}</td>
                    <td>{formatDate(v.passport_expiry)}</td>
                    <td>{formatDate(v.applied_on)}</td>
                    <td>{formatDate(v.expected_by)}</td>
                    <td>{v.handled_by}</td>
                    <td><span className={getStatusBadgeClass(v.docs_status)}>{v.docs_status}</span></td>
                    <td><span className={getStatusBadgeClass(v.status)}>{v.status}</span></td>
                    <td>
                      <button className="btn-act edit" onClick={() => handleEdit(v.id)}><i className="bi bi-pencil" /></button>
                      <button className="btn-act del" onClick={() => handleDelete(v.id)}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VisaModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} employees={employees} />
    </div>
  );
}
