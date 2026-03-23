import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';

const QUOTE_STATUSES = ['Awaiting', 'Accepted', 'Rejected', 'Revision'];

function QuoteModal({ show, onClose, onSave, initial, employees }) {
  const emptyQ = { client: '', phone: '', destination: '', pax: 1, duration: '', amount: '', prepared_by: '', valid_until: '', status: 'Awaiting', notes: '' };
  const [form, setForm] = useState(emptyQ);

  useEffect(() => {
    if (initial) setForm({ ...emptyQ, ...initial });
    else setForm(emptyQ);
  }, [initial, show]);

  if (!show) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">{initial?.id ? 'Edit Quotation' : 'New Quotation'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Client Name *</label>
                <input className="form-control" value={form.client} onChange={set('client')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Destination</label>
                <input className="form-control" value={form.destination} onChange={set('destination')} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Pax</label>
                <input type="number" className="form-control" value={form.pax} min={1} onChange={set('pax')} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Duration</label>
                <input className="form-control" value={form.duration} onChange={set('duration')} placeholder="7N/8D" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Amount (₹)</label>
                <input type="number" className="form-control" value={form.amount} onChange={set('amount')} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Valid Until</label>
                <input type="date" className="form-control" value={form.valid_until} onChange={set('valid_until')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Prepared By</label>
                {employees?.length > 0 ? (
                  <select className="form-select" value={form.prepared_by} onChange={set('prepared_by')}>
                    <option value="">— Select Staff —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input className="form-control" value={form.prepared_by} onChange={set('prepared_by')} placeholder="Staff name" />
                )}
              </div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} /></div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {QUOTE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>
              {initial?.id ? 'Update' : 'Create Quotation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Quotations() {
  const { showToast } = useToast();
  const [quotes, setQuotes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await api.get('/api/quotations/list');
      setQuotes(res.data.quotations || []);
    } catch {
      showToast('Failed to load quotations', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);
  useEffect(() => {
    api.get('/api/employees/staff').then((r) => setEmployees(r.data.employees || [])).catch(() => {});
  }, []);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/quotations/update/${editItem.id}`, form);
        showToast('Quotation updated', 'success');
      } else {
        await api.post('/api/quotations/add', form);
        showToast('Quotation created', 'success');
      }
      setModalShow(false);
      setEditItem(null);
      fetchQuotes();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quotation?')) return;
    try {
      await api.post(`/api/quotations/delete/${id}`);
      showToast('Quotation deleted', 'success');
      fetchQuotes();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/quotations/get/${id}`);
      setEditItem(res.data.quotation);
      setModalShow(true);
    } catch {
      showToast('Failed to load data', 'error');
    }
  };

  const filtered = quotes.filter((q) => {
    if (filterStatus && q.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return q.client?.toLowerCase().includes(s) || q.destination?.toLowerCase().includes(s) || q.quote_no?.toLowerCase().includes(s);
    }
    return true;
  });

  const total = quotes.length;
  const accepted = quotes.filter((q) => q.status === 'Accepted').length;
  const pending = quotes.filter((q) => q.status === 'Awaiting').length;
  const totalVal = quotes.reduce((s, q) => s + (parseFloat(q.amount) || 0), 0);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Quotations</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Quotation
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Quotes', value: total, cls: '' },
          { label: 'Accepted', value: accepted, cls: 'success' },
          { label: 'Awaiting', value: pending, cls: 'warning' },
          { label: 'Total Value', value: formatCurrency(totalVal), cls: 'info' },
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
        <input type="text" placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {QUOTE_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchQuotes}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Client</th>
                  <th>Phone</th>
                  <th>Destination</th>
                  <th>Pax</th>
                  <th>Duration</th>
                  <th>Amount</th>
                  <th>Date Sent</th>
                  <th>Valid Until</th>
                  <th>Prepared By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-4 text-muted">No quotations found.</td></tr>
                ) : filtered.map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{q.quote_no}</td>
                    <td style={{ fontWeight: 600 }}>{q.client}</td>
                    <td>{q.phone || '—'}</td>
                    <td>{q.destination}</td>
                    <td>{q.pax}</td>
                    <td>{q.duration}</td>
                    <td style={{ color: '#27ae60', fontWeight: 700 }}>{formatCurrency(q.amount)}</td>
                    <td>{formatDate(q.date_sent)}</td>
                    <td>{formatDate(q.valid_until)}</td>
                    <td>{q.prepared_by}</td>
                    <td><span className={getStatusBadgeClass(q.status)}>{q.status}</span></td>
                    <td>
                      <button className="btn-act edit" onClick={() => handleEdit(q.id)}><i className="bi bi-pencil" /></button>
                      <button className="btn-act del" onClick={() => handleDelete(q.id)}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QuoteModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} employees={employees} />
    </div>
  );
}
