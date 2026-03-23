import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';
import { PAYMENT_MODES } from '../utils/constants.js';

function RefundModal({ show, onClose, onSave, initial }) {
  const empty = { client: '', booking_ref: '', original_amount: '', refund_amount: '', reason: '', refund_mode: 'NEFT', refund_date: '', processed_by: '', status: 'Pending', notes: '' };
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
            <h5 className="modal-title">{initial?.id ? 'Edit Refund' : 'New Refund'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Client *</label><input className="form-control" value={form.client} onChange={set('client')} /></div>
              <div className="col-md-6"><label className="form-label">Booking Ref</label><input className="form-control" value={form.booking_ref} onChange={set('booking_ref')} /></div>
              <div className="col-md-4"><label className="form-label">Original Amount (₹)</label><input type="number" className="form-control" value={form.original_amount} onChange={set('original_amount')} /></div>
              <div className="col-md-4"><label className="form-label">Refund Amount (₹)</label><input type="number" className="form-control" value={form.refund_amount} onChange={set('refund_amount')} /></div>
              <div className="col-md-4">
                <label className="form-label">Refund Mode</label>
                <select className="form-select" value={form.refund_mode} onChange={set('refund_mode')}>
                  {[...PAYMENT_MODES, 'N/A'].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Reason</label><textarea className="form-control" rows={2} value={form.reason} onChange={set('reason')} /></div>
              <div className="col-md-4"><label className="form-label">Refund Date</label><input type="date" className="form-control" value={form.refund_date} onChange={set('refund_date')} /></div>
              <div className="col-md-4"><label className="form-label">Processed By</label><input className="form-control" value={form.processed_by} onChange={set('processed_by')} /></div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {['Pending', 'Processed', 'Rejected', 'Not Applicable'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Create Refund'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Refunds() {
  const { showToast } = useToast();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchRefunds = useCallback(async () => {
    try {
      const res = await api.get('/api/refunds/list');
      setRefunds(res.data.refunds || []);
    } catch { showToast('Failed to load refunds', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/refunds/update/${editItem.id}`, form);
        showToast('Updated', 'success');
      } else {
        await api.post('/api/refunds/add', form);
        showToast('Refund created', 'success');
      }
      setModalShow(false); setEditItem(null); fetchRefunds();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this refund?')) return;
    try {
      await api.post(`/api/refunds/delete/${id}`);
      showToast('Deleted', 'success'); fetchRefunds();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/refunds/get/${id}`);
      setEditItem(res.data.refund); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const filtered = refunds.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return r.client?.toLowerCase().includes(s) || r.booking_ref?.toLowerCase().includes(s) || r.refund_no?.toLowerCase().includes(s);
    }
    return true;
  });
  const totalRefunded = refunds.filter((r) => r.status === 'Processed').reduce((s, r) => s + (parseFloat(r.refund_amount) || 0), 0);
  const pendingCount = refunds.filter((r) => r.status === 'Pending').length;

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Refund & Cancellations</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Refund
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Refunds', value: refunds.length, cls: '' },
          { label: 'Pending', value: pendingCount, cls: 'warning' },
          { label: 'Processed', value: refunds.filter((r) => r.status === 'Processed').length, cls: 'success' },
          { label: 'Total Refunded', value: formatCurrency(totalRefunded), cls: 'danger' },
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
        <input type="text" placeholder="Search client, booking..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {['Pending', 'Processed', 'Rejected', 'Not Applicable'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchRefunds}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr><th>Refund #</th><th>Client</th><th>Booking Ref</th><th>Original</th><th>Refund Amt</th><th>Mode</th><th>Date</th><th>Processed By</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-4 text-muted">No refunds found.</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{r.refund_no}</td>
                    <td style={{ fontWeight: 600 }}>{r.client}</td>
                    <td>{r.booking_ref}</td>
                    <td>{formatCurrency(r.original_amount)}</td>
                    <td style={{ fontWeight: 700, color: '#e74c3c' }}>{formatCurrency(r.refund_amount)}</td>
                    <td>{r.refund_mode}</td>
                    <td>{formatDate(r.refund_date)}</td>
                    <td>{r.processed_by || '—'}</td>
                    <td><span className={getStatusBadgeClass(r.status)}>{r.status}</span></td>
                    <td>
                      <button className="btn-act edit" onClick={() => handleEdit(r.id)}><i className="bi bi-pencil" /></button>
                      <button className="btn-act del" onClick={() => handleDelete(r.id)}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RefundModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} />
    </div>
  );
}
