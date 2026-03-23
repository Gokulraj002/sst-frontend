import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';

function InvModal({ show, onClose, onSave, initial }) {
  const empty = {
    tour_name: '', destination: '', departure_date: '', return_date: '',
    total_seats: 0, booked_seats: 0, price_per_pax: '', status: 'Open', notes: '',
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
            <h5 className="modal-title">{initial?.id ? 'Edit Group Tour' : 'New Group Tour'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Tour Name *</label><input className="form-control" value={form.tour_name} onChange={set('tour_name')} /></div>
              <div className="col-md-6"><label className="form-label">Destination</label><input className="form-control" value={form.destination} onChange={set('destination')} /></div>
              <div className="col-md-3"><label className="form-label">Departure Date</label><input type="date" className="form-control" value={form.departure_date} onChange={set('departure_date')} /></div>
              <div className="col-md-3"><label className="form-label">Return Date</label><input type="date" className="form-control" value={form.return_date} onChange={set('return_date')} /></div>
              <div className="col-md-2"><label className="form-label">Total Seats</label><input type="number" className="form-control" value={form.total_seats} min={0} onChange={set('total_seats')} /></div>
              <div className="col-md-2"><label className="form-label">Booked Seats</label><input type="number" className="form-control" value={form.booked_seats} min={0} onChange={set('booked_seats')} /></div>
              <div className="col-md-2"><label className="form-label">Price/Pax (₹)</label><input type="number" className="form-control" value={form.price_per_pax} onChange={set('price_per_pax')} /></div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {['Open', 'Sold Out', 'Closed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Create Tour'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { showToast } = useToast();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchTours = useCallback(async () => {
    try {
      const res = await api.get('/api/inventory/list');
      setTours(res.data.inventory || []);
    } catch { showToast('Failed to load inventory', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTours(); }, [fetchTours]);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/inventory/update/${editItem.id}`, form);
        showToast('Tour updated', 'success');
      } else {
        await api.post('/api/inventory/add', form);
        showToast('Tour created', 'success');
      }
      setModalShow(false); setEditItem(null); fetchTours();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.post(`/api/inventory/delete/${id}`);
      showToast('Deleted', 'success'); fetchTours();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/inventory/get/${id}`);
      setEditItem(res.data.item); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const displayTours = tours.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.tour_name?.toLowerCase().includes(s) || t.destination?.toLowerCase().includes(s);
    }
    return true;
  });

  const totalSeats = tours.reduce((s, t) => s + (parseInt(t.total_seats) || 0), 0);
  const bookedSeats = tours.reduce((s, t) => s + (parseInt(t.booked_seats) || 0), 0);
  const openTours = tours.filter((t) => t.status === 'Open').length;

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Group Tour Inventory</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Tour
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Tours', value: tours.length, cls: '' },
          { label: 'Open Tours', value: openTours, cls: 'success' },
          { label: 'Total Seats', value: totalSeats, cls: 'info' },
          { label: 'Booked Seats', value: bookedSeats, cls: 'accent' },
          { label: 'Available', value: totalSeats - bookedSeats, cls: 'warning' },
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
        <input type="text" placeholder="Search tour, destination..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {['Open', 'Sold Out', 'Closed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchTours}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Tour Name</th><th>Destination</th><th>Departure</th><th>Return</th>
                  <th>Total Seats</th><th>Booked</th><th>Available</th><th>Price/Pax</th>
                  <th>Occupancy</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayTours.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-muted">No group tours.</td></tr>
                ) : displayTours.map((t) => {
                  const avail = (parseInt(t.total_seats) || 0) - (parseInt(t.booked_seats) || 0);
                  const occ = t.total_seats > 0 ? Math.round((t.booked_seats / t.total_seats) * 100) : 0;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{t.tour_name}</td>
                      <td>{t.destination}</td>
                      <td>{formatDate(t.departure_date)}</td>
                      <td>{formatDate(t.return_date)}</td>
                      <td>{t.total_seats}</td>
                      <td style={{ color: '#0D3B5E', fontWeight: 700 }}>{t.booked_seats}</td>
                      <td style={{ color: avail <= 2 ? '#e74c3c' : '#27ae60', fontWeight: 700 }}>{avail}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(t.price_per_pax)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 6, background: '#e9ecef', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${occ}%`, height: '100%', background: occ >= 90 ? '#e74c3c' : occ >= 70 ? '#f5a623' : '#27ae60', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700 }}>{occ}%</span>
                        </div>
                      </td>
                      <td><span className={getStatusBadgeClass(t.status)}>{t.status}</span></td>
                      <td>
                        <button className="btn-act edit" onClick={() => handleEdit(t.id)}><i className="bi bi-pencil" /></button>
                        <button className="btn-act del" onClick={() => handleDelete(t.id, t.tour_name)}><i className="bi bi-trash" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} />
    </div>
  );
}
