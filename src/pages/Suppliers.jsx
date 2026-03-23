import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, getStatusBadgeClass } from '../utils/formatters.js';
import { VENDOR_TYPES } from '../utils/constants.js';

function SupplierModal({ show, onClose, onSave, initial }) {
  const empty = {
    name: '', type: 'Hotel', contact_person: '', email: '', phone: '',
    city: '', balance: '', status: 'Active', rating: 4, notes: '',
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
            <h5 className="modal-title">{initial?.id ? 'Edit Supplier' : 'Add Supplier'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Company Name *</label><input className="form-control" value={form.name} onChange={set('name')} /></div>
              <div className="col-md-3">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={set('type')}>
                  {VENDOR_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Rating</label>
                <select className="form-select" value={form.rating} onChange={set('rating')}>
                  {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} Stars</option>)}
                </select>
              </div>
              <div className="col-md-6"><label className="form-label">Contact Person</label><input className="form-control" value={form.contact_person} onChange={set('contact_person')} /></div>
              <div className="col-md-3"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={set('phone')} /></div>
              <div className="col-md-3"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={set('email')} /></div>
              <div className="col-md-4"><label className="form-label">City</label><input className="form-control" value={form.city} onChange={set('city')} /></div>
              <div className="col-md-4"><label className="form-label">Balance (₹)</label><input type="number" className="form-control" value={form.balance} onChange={set('balance')} /></div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {['Active', 'Inactive', 'Blacklisted'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Add Supplier'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StarRating({ rating }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={`bi bi-star${i <= rating ? '-fill' : ''}`} style={{ color: '#f5a623', fontSize: '11px' }} />
      ))}
    </span>
  );
}

export default function Suppliers() {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get('/api/vendors/list');
      setSuppliers(res.data.vendors || []);
    } catch { showToast('Failed to load suppliers', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/vendors/update/${editItem.id}`, form);
        showToast('Supplier updated', 'success');
      } else {
        await api.post('/api/vendors/add', form);
        showToast('Supplier added', 'success');
      }
      setModalShow(false); setEditItem(null); fetchSuppliers();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete supplier "${name}"?`)) return;
    try {
      await api.post(`/api/vendors/delete/${id}`);
      showToast('Deleted', 'success'); fetchSuppliers();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/vendors/get/${id}`);
      setEditItem(res.data.vendor); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const filtered = suppliers.filter((s) => {
    if (filterType && s.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.contact_person?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalBalance = suppliers.reduce((s, v) => s + (parseFloat(v.balance) || 0), 0);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Supplier Management</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> Add Supplier
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Suppliers', value: suppliers.length, cls: '' },
          { label: 'Hotels', value: suppliers.filter((s) => s.type === 'Hotel').length, cls: 'info' },
          { label: 'Transport', value: suppliers.filter((s) => s.type === 'Transport').length, cls: 'accent' },
          { label: 'Airlines', value: suppliers.filter((s) => s.type === 'Airline').length, cls: 'success' },
          { label: 'Total Balance', value: formatCurrency(totalBalance), cls: 'warning' },
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
        <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {VENDOR_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchSuppliers}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th>
                  <th>Type</th><th>City</th><th>Rating</th><th>Balance</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-muted">No suppliers found.</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id}>
                    <td style={{ color: '#888', fontSize: '12px' }}>{s.id}</td>
                    <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{s.name}</td>
                    <td>{s.contact_person || s.location}</td>
                    <td style={{ fontSize: '12px' }}>{s.email}</td>
                    <td>{s.phone}</td>
                    <td>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: '#e7f3ff', color: '#2980b9' }}>
                        {s.type}
                      </span>
                    </td>
                    <td>{s.city || s.location}</td>
                    <td><StarRating rating={parseInt(s.rating) || 4} /></td>
                    <td style={{ fontWeight: 600, color: parseFloat(s.balance) > 0 ? '#e74c3c' : '#27ae60' }}>
                      {formatCurrency(s.balance || 0)}
                    </td>
                    <td><span className={getStatusBadgeClass(s.status || 'Active')}>{s.status || 'Active'}</span></td>
                    <td>
                      <button className="btn-act edit" onClick={() => handleEdit(s.id)}><i className="bi bi-pencil" /></button>
                      <button className="btn-act del" onClick={() => handleDelete(s.id, s.name)}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SupplierModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} />
    </div>
  );
}
