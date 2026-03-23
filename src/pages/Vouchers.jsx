import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';
import { VOUCHER_TYPES } from '../utils/constants.js';

function VoucherModal({ show, onClose, onSave, initial }) {
  const empty = { voucher_type: 'Payment', party_name: '', amount: '', narration: '', voucher_date: '', prepared_by: '', status: 'Draft' };
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
            <h5 className="modal-title">{initial?.id ? 'Edit Voucher' : 'New Voucher'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Voucher Type</label>
                <select className="form-select" value={form.voucher_type} onChange={set('voucher_type')}>
                  {VOUCHER_TYPES.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="col-md-8"><label className="form-label">Party Name *</label><input className="form-control" value={form.party_name} onChange={set('party_name')} /></div>
              <div className="col-md-4"><label className="form-label">Amount (₹)</label><input type="number" className="form-control" value={form.amount} onChange={set('amount')} /></div>
              <div className="col-md-4"><label className="form-label">Voucher Date</label><input type="date" className="form-control" value={form.voucher_date} onChange={set('voucher_date')} /></div>
              <div className="col-md-4"><label className="form-label">Prepared By</label><input className="form-control" value={form.prepared_by} onChange={set('prepared_by')} /></div>
              <div className="col-12"><label className="form-label">Narration</label><textarea className="form-control" rows={2} value={form.narration} onChange={set('narration')} /></div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {['Draft', 'Approved', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Create Voucher'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TYPE_COLORS = { Payment: '#e74c3c', Receipt: '#27ae60', Journal: '#2980b9', Contra: '#8e44ad' };

export default function Vouchers() {
  const { showToast } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterType, setFilterType] = useState('');

  const fetchVouchers = useCallback(async () => {
    try {
      const res = await api.get('/api/vouchers/list');
      setVouchers(res.data.vouchers || []);
    } catch { showToast('Failed to load vouchers', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/vouchers/update/${editItem.id}`, form);
        showToast('Voucher updated', 'success');
      } else {
        await api.post('/api/vouchers/add', form);
        showToast('Voucher created', 'success');
      }
      setModalShow(false); setEditItem(null); fetchVouchers();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this voucher?')) return;
    try {
      await api.post(`/api/vouchers/delete/${id}`);
      showToast('Deleted', 'success'); fetchVouchers();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/vouchers/get/${id}`);
      setEditItem(res.data.voucher); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const filtered = filterType ? vouchers.filter((v) => v.voucher_type === filterType) : vouchers;
  const totalAmt = vouchers.reduce((s, v) => s + (parseFloat(v.amount) || 0), 0);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Voucher Generation</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Voucher
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Vouchers', value: vouchers.length, cls: '' },
          { label: 'Total Amount', value: formatCurrency(totalAmt), cls: 'info' },
          { label: 'Draft', value: vouchers.filter((v) => v.status === 'Draft').length, cls: 'warning' },
          { label: 'Completed', value: vouchers.filter((v) => v.status === 'Completed').length, cls: 'success' },
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
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {VOUCHER_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchVouchers}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr><th>Voucher #</th><th>Type</th><th>Party</th><th>Amount</th><th>Date</th><th>Narration</th><th>Prepared By</th><th>Approved By</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-4 text-muted">No vouchers found.</td></tr>
                ) : filtered.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{v.voucher_no}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                        background: `${TYPE_COLORS[v.voucher_type] || '#888'}20`,
                        color: TYPE_COLORS[v.voucher_type] || '#888',
                      }}>
                        {v.voucher_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{v.party_name}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(v.amount)}</td>
                    <td>{formatDate(v.voucher_date)}</td>
                    <td style={{ fontSize: '12px', maxWidth: 200 }}>{v.narration}</td>
                    <td>{v.prepared_by}</td>
                    <td>{v.approved_by || '—'}</td>
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

      <VoucherModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} />
    </div>
  );
}
