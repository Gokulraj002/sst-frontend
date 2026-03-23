import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';
import { APPROVAL_STATUSES } from '../utils/constants.js';

function ApprovalModal({ show, onClose, onSave, initial }) {
  const empty = {
    request_type: 'Expense', requested_by: '', description: '',
    amount: '', request_date: '', status: 'Pending', remarks: '',
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
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">{initial?.id ? 'Edit Approval Request' : 'New Approval Request'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Request Type</label>
                <select className="form-select" value={form.request_type} onChange={set('request_type')}>
                  {['Expense', 'Refund', 'Discount', 'Travel', 'Leave', 'Other'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-6"><label className="form-label">Requested By</label><input className="form-control" value={form.requested_by} onChange={set('requested_by')} /></div>
              <div className="col-12"><label className="form-label">Description</label><textarea className="form-control" rows={2} value={form.description} onChange={set('description')} /></div>
              <div className="col-md-4"><label className="form-label">Amount (₹)</label><input type="number" className="form-control" value={form.amount} onChange={set('amount')} /></div>
              <div className="col-md-4"><label className="form-label">Request Date</label><input type="date" className="form-control" value={form.request_date} onChange={set('request_date')} /></div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {APPROVAL_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Remarks</label><textarea className="form-control" rows={2} value={form.remarks} onChange={set('remarks')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Submit Request'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Approvals() {
  const { showToast } = useToast();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await api.get('/api/approvals/list');
      setApprovals(res.data.approvals || []);
    } catch { showToast('Failed to load approvals', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/approvals/update/${editItem.id}`, form);
        showToast('Updated', 'success');
      } else {
        await api.post('/api/approvals/add', form);
        showToast('Request submitted', 'success');
      }
      setModalShow(false); setEditItem(null); fetchApprovals();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleAction = async (id, action) => {
    try {
      await api.post(`/api/approvals/${action}/${id}`);
      showToast(`Request ${action}d`, action === 'approve' ? 'success' : 'warning');
      fetchApprovals();
    } catch { showToast('Action failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/approvals/get/${id}`);
      setEditItem(res.data.approval); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const filtered = filterStatus ? approvals.filter((a) => a.status === filterStatus) : approvals;
  const pending = approvals.filter((a) => a.status === 'Pending').length;
  const approved = approvals.filter((a) => a.status === 'Approved').length;
  const totalAmt = approvals.filter((a) => a.status === 'Approved').reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Approval Center</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Request
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Requests', value: approvals.length, cls: '' },
          { label: 'Pending', value: pending, cls: 'warning' },
          { label: 'Approved', value: approved, cls: 'success' },
          { label: 'Approved Amount', value: formatCurrency(totalAmt), cls: 'info' },
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
          {APPROVAL_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchApprovals}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Approval #</th><th>Type</th><th>Requested By</th><th>Description</th>
                  <th>Amount</th><th>Date</th><th>Status</th><th>Approved By</th><th>Remarks</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-4 text-muted">No approval requests.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{a.approval_no}</td>
                    <td>{a.request_type}</td>
                    <td style={{ fontWeight: 600 }}>{a.requested_by}</td>
                    <td style={{ maxWidth: 200 }}>{a.description}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(a.amount)}</td>
                    <td>{formatDate(a.request_date)}</td>
                    <td><span className={getStatusBadgeClass(a.status)}>{a.status}</span></td>
                    <td>{a.approved_by || '—'}</td>
                    <td style={{ fontSize: '12px', color: '#888', maxWidth: 160 }}>{a.remarks || '—'}</td>
                    <td>
                      {a.status === 'Pending' && (
                        <>
                          <button className="btn-act approve" onClick={() => handleAction(a.id, 'approve')}>
                            <i className="bi bi-check" /> Approve
                          </button>
                          <button className="btn-act reject" onClick={() => handleAction(a.id, 'reject')}>
                            <i className="bi bi-x" /> Reject
                          </button>
                        </>
                      )}
                      <button className="btn-act edit" onClick={() => handleEdit(a.id)}><i className="bi bi-pencil" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ApprovalModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} />
    </div>
  );
}
