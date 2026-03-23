import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, getStatusBadgeClass } from '../utils/formatters.js';

const DOC_TYPES = ['Passport', 'Visa Document', 'Corporate Policy', 'Company Document', 'Invoice', 'Contract', 'Insurance', 'General'];

function DocModal({ show, onClose, onSave, initial, employees }) {
  const empty = {
    title: '', doc_type: 'General', related_to: '', client: '',
    uploaded_by: '', status: 'Active', expiry_date: '', notes: '',
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
            <h5 className="modal-title">{initial?.id ? 'Edit Document' : 'Add Document'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Title *</label><input className="form-control" value={form.title} onChange={set('title')} /></div>
              <div className="col-md-6">
                <label className="form-label">Document Type</label>
                <select className="form-select" value={form.doc_type} onChange={set('doc_type')}>
                  {DOC_TYPES.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-md-6"><label className="form-label">Related To (Booking/Lead Ref)</label><input className="form-control" value={form.related_to} onChange={set('related_to')} /></div>
              <div className="col-md-6"><label className="form-label">Client</label><input className="form-control" value={form.client} onChange={set('client')} /></div>
              <div className="col-md-6">
                <label className="form-label">Uploaded By</label>
                {employees?.length > 0 ? (
                  <select className="form-select" value={form.uploaded_by} onChange={set('uploaded_by')}>
                    <option value="">— Select Staff —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input className="form-control" value={form.uploaded_by} onChange={set('uploaded_by')} placeholder="Staff name" />
                )}
              </div>
              <div className="col-md-3"><label className="form-label">Expiry Date</label><input type="date" className="form-control" value={form.expiry_date} onChange={set('expiry_date')} /></div>
              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {['Active', 'Expired', 'Archived'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Add Document'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const { showToast } = useToast();
  const [docs, setDocs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchDocs = useCallback(async () => {
    try {
      const res = await api.get('/api/documents/list');
      setDocs(res.data.documents || []);
    } catch { showToast('Failed to load documents', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => {
    api.get('/api/employees/staff').then((r) => setEmployees(r.data.employees || [])).catch(() => {});
  }, []);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/documents/update/${editItem.id}`, form);
        showToast('Document updated', 'success');
      } else {
        await api.post('/api/documents/add', form);
        showToast('Document added', 'success');
      }
      setModalShow(false); setEditItem(null); fetchDocs();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await api.post(`/api/documents/delete/${id}`);
      showToast('Deleted', 'success'); fetchDocs();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/documents/get/${id}`);
      setEditItem(res.data.document); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const filtered = docs.filter((d) => {
    if (filterType && d.doc_type !== filterType) return false;
    if (filterStatus && d.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return d.title?.toLowerCase().includes(s) || d.related_to?.toLowerCase().includes(s) || d.client?.toLowerCase().includes(s);
    }
    return true;
  });

  const active = docs.filter((d) => d.status === 'Active').length;
  const expired = docs.filter((d) => d.status === 'Expired').length;
  const expiringSoon = docs.filter((d) => {
    if (!d.expiry_date) return false;
    const diff = (new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  }).length;

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Document Management</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> Add Document
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Documents', value: docs.length, cls: '' },
          { label: 'Active', value: active, cls: 'success' },
          { label: 'Expired', value: expired, cls: 'danger' },
          { label: 'Expiring Soon (30d)', value: expiringSoon, cls: 'warning' },
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
        <input type="text" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {['Active', 'Expired', 'Archived'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchDocs}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Doc #</th><th>Title</th><th>Type</th><th>Related To</th><th>Client</th>
                  <th>Uploaded By</th><th>Expiry Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-4 text-muted">No documents found.</td></tr>
                ) : filtered.map((doc) => {
                  const isExpiringSoon = doc.expiry_date && (() => {
                    const diff = (new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
                    return diff <= 30 && diff >= 0;
                  })();
                  return (
                    <tr key={doc.id} style={{ borderLeft: isExpiringSoon ? '3px solid #e67e22' : undefined }}>
                      <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{doc.doc_no}</td>
                      <td style={{ fontWeight: 600 }}>{doc.title}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: '#e7f3ff', color: '#2980b9' }}>
                          {doc.doc_type}
                        </span>
                      </td>
                      <td>{doc.related_to || '—'}</td>
                      <td>{doc.client || '—'}</td>
                      <td>{doc.uploaded_by}</td>
                      <td style={{ color: isExpiringSoon ? '#e67e22' : 'inherit', fontWeight: isExpiringSoon ? 700 : 400 }}>
                        {formatDate(doc.expiry_date)}
                        {isExpiringSoon && <span className="ms-1" style={{ fontSize: '10px', color: '#e67e22' }}>Soon!</span>}
                      </td>
                      <td><span className={getStatusBadgeClass(doc.status)}>{doc.status}</span></td>
                      <td>
                        <button className="btn-act edit" onClick={() => handleEdit(doc.id)}><i className="bi bi-pencil" /></button>
                        <button className="btn-act del" onClick={() => handleDelete(doc.id, doc.title)}><i className="bi bi-trash" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DocModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} employees={employees} />
    </div>
  );
}
