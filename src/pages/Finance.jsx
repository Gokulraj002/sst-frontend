import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';
import { PAYMENT_MODES } from '../utils/constants.js';

const INV_STATUSES = ['Unpaid', 'Partial', 'Paid'];

function InvoiceModal({ show, onClose, onSave, initial }) {
  const empty = { client: '', booking_ref: '', invoice_date: '', due_date: '', amount: '', paid: '', gst_rate: 5, status: 'Unpaid' };
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
            <h5 className="modal-title">{initial?.id ? 'Edit Invoice' : 'New Invoice'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Client *</label><input className="form-control" value={form.client} onChange={set('client')} /></div>
              <div className="col-md-6"><label className="form-label">Booking Ref</label><input className="form-control" value={form.booking_ref} onChange={set('booking_ref')} /></div>
              <div className="col-md-4"><label className="form-label">Invoice Date</label><input type="date" className="form-control" value={form.invoice_date} onChange={set('invoice_date')} /></div>
              <div className="col-md-4"><label className="form-label">Due Date</label><input type="date" className="form-control" value={form.due_date} onChange={set('due_date')} /></div>
              <div className="col-md-4"><label className="form-label">GST Rate (%)</label><input type="number" className="form-control" value={form.gst_rate} onChange={set('gst_rate')} /></div>
              <div className="col-md-4"><label className="form-label">Total Amount (₹)</label><input type="number" className="form-control" value={form.amount} onChange={set('amount')} /></div>
              <div className="col-md-4"><label className="form-label">Paid (₹)</label><input type="number" className="form-control" value={form.paid} onChange={set('paid')} /></div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {INV_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Create Invoice'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Finance() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await api.get('/api/invoices/list');
      setInvoices(res.data.invoices || []);
      setStats(res.data.stats || {});
    } catch { showToast('Failed to load invoices', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/invoices/update/${editItem.id}`, form);
        showToast('Invoice updated', 'success');
      } else {
        await api.post('/api/invoices/add', form);
        showToast('Invoice created', 'success');
      }
      setModalShow(false); setEditItem(null); fetchInvoices();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await api.post(`/api/invoices/delete/${id}`);
      showToast('Deleted', 'success'); fetchInvoices();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/invoices/get/${id}`);
      setEditItem(res.data.invoice); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const filtered = invoices.filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return inv.client?.toLowerCase().includes(s) || inv.invoice_no?.toLowerCase().includes(s);
    }
    return true;
  });

  const totalAmt = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (parseFloat(i.paid) || 0), 0);
  const totalBalance = Math.max(0, totalAmt - totalPaid);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Finance & Accounting</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Invoice
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Invoiced', value: formatCurrency(totalAmt), cls: '' },
          { label: 'Collected', value: formatCurrency(totalPaid), cls: 'success' },
          { label: 'Outstanding', value: formatCurrency(totalBalance), cls: 'danger' },
          { label: 'Invoices', value: invoices.length, cls: 'info' },
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
        <input type="text" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {INV_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchInvoices}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Invoice #</th><th>Client</th><th>Booking Ref</th><th>Date</th>
                  <th>Due Date</th><th>Amount</th><th>GST</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-muted">No invoices found.</td></tr>
                ) : filtered.map((inv) => {
                  const balance = Math.max(0, (parseFloat(inv.amount) || 0) - (parseFloat(inv.paid) || 0));
                  const gstAmt = ((parseFloat(inv.amount) || 0) * (parseFloat(inv.gst_rate) || 5)) / 100;
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{inv.invoice_no}</td>
                      <td style={{ fontWeight: 600 }}>{inv.client}</td>
                      <td>{inv.booking_ref}</td>
                      <td>{formatDate(inv.invoice_date)}</td>
                      <td>{formatDate(inv.due_date)}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(inv.amount)}</td>
                      <td>{inv.gst_rate}% / {formatCurrency(gstAmt)}</td>
                      <td style={{ color: '#27ae60', fontWeight: 600 }}>{formatCurrency(inv.paid)}</td>
                      <td style={{ color: balance > 0 ? '#e74c3c' : '#27ae60', fontWeight: 700 }}>{formatCurrency(balance)}</td>
                      <td><span className={getStatusBadgeClass(inv.status)}>{inv.status}</span></td>
                      <td>
                        <button className="btn-act edit" onClick={() => handleEdit(inv.id)}><i className="bi bi-pencil" /></button>
                        <button className="btn-act del" onClick={() => handleDelete(inv.id)}><i className="bi bi-trash" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} />
    </div>
  );
}
