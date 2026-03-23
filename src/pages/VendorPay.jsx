import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';
import { PAYMENT_MODES } from '../utils/constants.js';

const SERVICE_TYPES = ['Hotel', 'Transport', 'Airline', 'Visa', 'Insurance', 'Tour Package', 'Other'];

function VendorPayModal({ show, onClose, onSave, initial }) {
  const empty = {
    vendor_name: '', service_type: 'Hotel', booking_ref: '', amount: '', paid: '',
    due_date: '', payment_date: '', payment_mode: 'NEFT', status: 'Pending', notes: '',
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
            <h5 className="modal-title">{initial?.id ? 'Edit Payment' : 'New Vendor Payment'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Vendor Name *</label><input className="form-control" value={form.vendor_name} onChange={set('vendor_name')} /></div>
              <div className="col-md-6">
                <label className="form-label">Service Type</label>
                <select className="form-select" value={form.service_type} onChange={set('service_type')}>
                  {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-md-6"><label className="form-label">Booking Ref</label><input className="form-control" value={form.booking_ref} onChange={set('booking_ref')} /></div>
              <div className="col-md-3"><label className="form-label">Total Amount (₹)</label><input type="number" className="form-control" value={form.amount} onChange={set('amount')} /></div>
              <div className="col-md-3"><label className="form-label">Paid (₹)</label><input type="number" className="form-control" value={form.paid} onChange={set('paid')} /></div>
              <div className="col-md-4"><label className="form-label">Due Date</label><input type="date" className="form-control" value={form.due_date} onChange={set('due_date')} /></div>
              <div className="col-md-4"><label className="form-label">Payment Date</label><input type="date" className="form-control" value={form.payment_date} onChange={set('payment_date')} /></div>
              <div className="col-md-4">
                <label className="form-label">Mode</label>
                <select className="form-select" value={form.payment_mode} onChange={set('payment_mode')}>
                  {PAYMENT_MODES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {['Pending', 'Partial', 'Paid', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Create Payment'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VendorPay() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      const res = await api.get('/api/vendorpay/list');
      setPayments(res.data.payments || []);
    } catch { showToast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/vendorpay/update/${editItem.id}`, form);
        showToast('Updated', 'success');
      } else {
        await api.post('/api/vendorpay/add', form);
        showToast('Payment created', 'success');
      }
      setModalShow(false); setEditItem(null); fetchPayments();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await api.post(`/api/vendorpay/delete/${id}`);
      showToast('Deleted', 'success'); fetchPayments();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/vendorpay/get/${id}`);
      setEditItem(res.data.payment); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const filtered = payments.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.vendor_name?.toLowerCase().includes(s) || p.booking_ref?.toLowerCase().includes(s) || p.payment_no?.toLowerCase().includes(s);
    }
    return true;
  });

  const totalAmt = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const paidAmt = payments.reduce((s, p) => s + (parseFloat(p.paid || 0) || 0), 0);
  const pendingAmt = payments.filter((p) => p.status === 'Pending').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const balance = totalAmt - paidAmt;

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Vendor Payments</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Payment
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Payable', value: formatCurrency(totalAmt), cls: '' },
          { label: 'Paid', value: formatCurrency(paidAmt), cls: 'success' },
          { label: 'Balance', value: formatCurrency(balance < 0 ? 0 : balance), cls: 'danger' },
          { label: 'Pending Count', value: payments.filter((p) => p.status === 'Pending').length, cls: 'warning' },
          { label: 'Total Records', value: payments.length, cls: 'info' },
        ].map((k) => (
          <div className="col-6 col-md-4 col-lg" key={k.label}>
            <div className={`kpi-card ${k.cls}`}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search vendor, booking..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {['Pending', 'Partial', 'Paid', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchPayments}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Pay #</th><th>Vendor</th><th>Service Type</th><th>Booking Ref</th>
                  <th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th>
                  <th>Mode</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-muted">No vendor payments.</td></tr>
                ) : filtered.map((p) => {
                  const paid = parseFloat(p.paid || (p.status === 'Paid' ? p.amount : 0)) || 0;
                  const bal = (parseFloat(p.amount) || 0) - paid;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{p.payment_no}</td>
                      <td style={{ fontWeight: 600 }}>{p.vendor_name}</td>
                      <td>{p.service_type}</td>
                      <td>{p.booking_ref}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                      <td style={{ color: '#27ae60', fontWeight: 600 }}>{formatCurrency(paid)}</td>
                      <td style={{ color: bal > 0 ? '#e74c3c' : '#27ae60', fontWeight: 700 }}>{formatCurrency(bal)}</td>
                      <td>{formatDate(p.due_date || p.payment_date)}</td>
                      <td>{p.payment_mode}</td>
                      <td><span className={getStatusBadgeClass(p.status)}>{p.status}</span></td>
                      <td>
                        <button className="btn-act edit" onClick={() => handleEdit(p.id)}><i className="bi bi-pencil" /></button>
                        <button className="btn-act del" onClick={() => handleDelete(p.id)}><i className="bi bi-trash" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VendorPayModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} />
    </div>
  );
}
