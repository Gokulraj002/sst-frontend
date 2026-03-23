import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';
import { BOOKING_STATUSES, TOUR_TYPES, PAYMENT_MODES } from '../utils/constants.js';

function BookingModal({ show, onClose, onSave, initial, employees }) {
  const emptyForm = {
    client: '', phone: '', destination: '', tour_type: 'FIT', pax: 1,
    depart_date: '', return_date: '', sales_person: '',
    package_amount: '', advance_paid: '', payment_mode: 'UPI', status: 'Confirmed', notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (initial) setForm({
      ...emptyForm, ...initial,
      depart_date: initial.depart_date ? String(initial.depart_date).split('T')[0] : '',
      return_date:  initial.return_date  ? String(initial.return_date).split('T')[0]  : '',
    });
    else setForm(emptyForm);
  }, [initial, show]);

  if (!show) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">{initial?.id ? 'Edit Booking' : 'New Booking'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Client Name *</label>
                <input className="form-control" value={form.client} onChange={set('client')} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Tour Type</label>
                <select className="form-select" value={form.tour_type} onChange={set('tour_type')}>
                  {TOUR_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Destination</label>
                <input className="form-control" value={form.destination} onChange={set('destination')} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Pax</label>
                <input type="number" className="form-control" value={form.pax} min={1} onChange={set('pax')} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Depart Date</label>
                <input type="date" className="form-control" value={form.depart_date} onChange={set('depart_date')} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Return Date</label>
                <input type="date" className="form-control" value={form.return_date} onChange={set('return_date')} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Sales Person</label>
                {employees?.length > 0 ? (
                  <select className="form-select" value={form.sales_person} onChange={set('sales_person')}>
                    <option value="">— Select Sales Person —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input className="form-control" value={form.sales_person} onChange={set('sales_person')} placeholder="Sales person name" />
                )}
              </div>
              <div className="col-md-3">
                <label className="form-label">Package Amount (₹)</label>
                <input type="number" className="form-control" value={form.package_amount} onChange={set('package_amount')} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Advance Paid (₹)</label>
                <input type="number" className="form-control" value={form.advance_paid} onChange={set('advance_paid')} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Payment Mode</label>
                <select className="form-select" value={form.payment_mode} onChange={set('payment_mode')}>
                  {PAYMENT_MODES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>
              {initial?.id ? 'Update Booking' : 'Create Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Bookings() {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/api/bookings/list');
      setBookings(res.data.bookings || []);
      setStats(res.data.stats || {});
    } catch {
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => {
    api.get('/api/employees/staff').then((r) => setEmployees(r.data.employees || [])).catch(() => {});
  }, []);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/bookings/update/${editItem.id}`, form);
        showToast('Booking updated', 'success');
      } else {
        await api.post('/api/bookings/add', form);
        showToast('Booking created', 'success');
      }
      setModalShow(false);
      setEditItem(null);
      fetchBookings();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    }
  };

  const handleDelete = async (id, client) => {
    if (!window.confirm(`Delete booking for "${client}"?`)) return;
    try {
      await api.post(`/api/bookings/delete/${id}`);
      showToast('Booking deleted', 'success');
      fetchBookings();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/bookings/get/${id}`);
      setEditItem(res.data.booking);
      setModalShow(true);
    } catch {
      showToast('Failed to load booking', 'error');
    }
  };

  const filtered = bookings.filter((b) => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterType && b.tour_type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        b.client?.toLowerCase().includes(s) ||
        b.booking_no?.toLowerCase().includes(s) ||
        b.destination?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const totalRev = bookings.reduce((s, b) => s + (parseFloat(b.package_amount) || 0), 0);
  const totalAdv = bookings.reduce((s, b) => s + (parseFloat(b.advance_paid) || 0), 0);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Bookings</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Booking
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Bookings', value: bookings.length, cls: '' },
          { label: 'Confirmed', value: bookings.filter((b) => b.status === 'Confirmed').length, cls: 'success' },
          { label: 'Total Revenue', value: formatCurrency(totalRev), cls: 'info' },
          { label: 'Advance Collected', value: formatCurrency(totalAdv), cls: 'accent' },
          { label: 'Balance Due', value: formatCurrency(totalRev - totalAdv), cls: 'warning' },
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
        <input type="text" placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {TOUR_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchBookings}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>Client</th>
                  <th>Phone</th>
                  <th>Destination</th>
                  <th>Type</th>
                  <th>Pax</th>
                  <th>Depart</th>
                  <th>Return</th>
                  <th>Package</th>
                  <th>Advance</th>
                  <th>Balance</th>
                  <th>Mode</th>
                  <th>Sales Person</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={15} className="text-center py-4 text-muted">No bookings found.</td></tr>
                ) : filtered.map((b) => {
                  const balance = (parseFloat(b.package_amount) || 0) - (parseFloat(b.advance_paid) || 0);
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{b.booking_no}</td>
                      <td style={{ fontWeight: 600 }}>{b.client}</td>
                      <td>{b.phone}</td>
                      <td>{b.destination}</td>
                      <td>{b.tour_type}</td>
                      <td>{b.pax}</td>
                      <td>{formatDate(b.depart_date)}</td>
                      <td>{formatDate(b.return_date)}</td>
                      <td style={{ color: '#27ae60', fontWeight: 700 }}>{formatCurrency(b.package_amount)}</td>
                      <td style={{ color: '#2980b9', fontWeight: 600 }}>{formatCurrency(b.advance_paid)}</td>
                      <td style={{ color: balance > 0 ? '#e74c3c' : '#27ae60', fontWeight: 600 }}>
                        {formatCurrency(balance)}
                      </td>
                      <td>{b.payment_mode}</td>
                      <td>{b.sales_person || '—'}</td>
                      <td><span className={getStatusBadgeClass(b.status)}>{b.status}</span></td>
                      <td>
                        <button className="btn-act edit" onClick={() => handleEdit(b.id)}><i className="bi bi-pencil" /></button>
                        <button className="btn-act del" onClick={() => handleDelete(b.id, b.client)}><i className="bi bi-trash" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BookingModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} employees={employees} />
    </div>
  );
}
