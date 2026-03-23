import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { LOYALTY_TIERS } from '../utils/constants.js';

/* ─── useDebounce ─────────────────────────────────────────────────────────── */
function useDebounce(value, ms = 400) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return deb;
}

/* ─── Pagination ──────────────────────────────────────────────────────────── */
function Pagination({ pagination, onPageChange, onLimitChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const btn = (label, target, disabled) => (
    <button
      key={label}
      className="btn btn-sm btn-outline-secondary"
      disabled={disabled}
      onClick={() => onPageChange(target)}
      style={{ minWidth: 36 }}
    >
      {label}
    </button>
  );

  const pages_arr = [];
  const delta = 2;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - delta && i <= page + delta)) {
      pages_arr.push(i);
    } else if (pages_arr[pages_arr.length - 1] !== '…') {
      pages_arr.push('…');
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
      <span style={{ fontSize: 13, color: '#666' }}>
        Showing <b>{from}–{to}</b> of <b>{total}</b> customers
      </span>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {btn('«', 1, page === 1)}
        {btn('‹', page - 1, page === 1)}
        {pages_arr.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} style={{ padding: '0 4px' }}>…</span>
            : <button
                key={p}
                className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => onPageChange(p)}
                style={{ minWidth: 36 }}
              >{p}</button>
        )}
        {btn('›', page + 1, page === pages)}
        {btn('»', pages, page === pages)}
        <select
          className="form-select form-select-sm"
          style={{ width: 80 }}
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
        >
          {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}/pg</option>)}
        </select>
      </div>
    </div>
  );
}

/* ─── Customer Modal ──────────────────────────────────────────────────────── */
function CustomerModal({ show, onClose, onSave, initial }) {
  const empty = {
    name: '', email: '', phone: '', city: '',
    total_bookings: 0, total_spent: 0, last_travel_date: '',
    loyalty_tier: 'Regular', notes: '',
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        ...empty,
        ...initial,
        last_travel_date: initial.last_travel_date
          ? String(initial.last_travel_date).split('T')[0]
          : '',
      });
    } else {
      setForm(empty);
    }
  }, [initial, show]);

  if (!show) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Name is required');
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">{initial?.id ? 'Edit Customer' : 'Add Customer'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name <span style={{ color: 'red' }}>*</span></label>
                <input className="form-control" value={form.name} onChange={set('name')} placeholder="Customer name" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={set('email')} placeholder="email@example.com" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={set('phone')} placeholder="+91 ..." />
              </div>
              <div className="col-md-4">
                <label className="form-label">City</label>
                <input className="form-control" value={form.city} onChange={set('city')} placeholder="City" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Loyalty Tier</label>
                <select className="form-select" value={form.loyalty_tier} onChange={set('loyalty_tier')}>
                  {LOYALTY_TIERS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Total Bookings</label>
                <input type="number" className="form-control" value={form.total_bookings} onChange={set('total_bookings')} min={0} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Total Spent (₹)</label>
                <input type="number" className="form-control" value={form.total_spent} onChange={set('total_spent')} min={0} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Last Travel Date</label>
                <input type="date" className="form-control" value={form.last_travel_date} onChange={set('last_travel_date')} />
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} placeholder="Any additional notes..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              {initial?.id ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Customer Detail Panel ───────────────────────────────────────────────── */
function CustomerDetailPanel({ customer, onClose, onEdit }) {
  if (!customer) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 420, height: '100vh',
      background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      zIndex: 1050, display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{customer.name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{customer.customer_no}</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-primary" onClick={() => onEdit(customer)}>
            <i className="bi bi-pencil" /> Edit
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>✕</button>
        </div>
      </div>
      <div style={{ padding: '20px 24px', flex: 1 }}>
        <div className="row g-3">
          <div className="col-6">
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Email</div>
            <div style={{ fontSize: 14 }}>{customer.email || '—'}</div>
          </div>
          <div className="col-6">
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Phone</div>
            <div style={{ fontSize: 14 }}>{customer.phone || '—'}</div>
          </div>
          <div className="col-6">
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>City</div>
            <div style={{ fontSize: 14 }}>{customer.city || '—'}</div>
          </div>
          <div className="col-6">
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Loyalty Tier</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TIER_COLORS[customer.loyalty_tier] || '#888' }}>
              <i className={`bi ${TIER_ICONS[customer.loyalty_tier] || 'bi-person'} me-1`} />
              {customer.loyalty_tier}
            </div>
          </div>
          <div className="col-6">
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Total Bookings</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0D3B5E' }}>{customer.total_bookings || 0}</div>
          </div>
          <div className="col-6">
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Lifetime Value</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#27ae60' }}>{formatCurrency(customer.total_spent)}</div>
          </div>
          <div className="col-12">
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Last Travel Date</div>
            <div style={{ fontSize: 14 }}>{formatDate(customer.last_travel_date) || '—'}</div>
          </div>
          {customer.notes && (
            <div className="col-12">
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: 13, background: '#f8f9fa', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6 }}>
                {customer.notes}
              </div>
            </div>
          )}
          <div className="col-12">
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Member Since</div>
            <div style={{ fontSize: 14 }}>{formatDate(customer.created_at) || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TIER_COLORS = { Platinum: '#8e44ad', Gold: '#f5a623', Silver: '#666', Regular: '#27ae60' };
const TIER_ICONS = { Platinum: 'bi-gem', Gold: 'bi-star-fill', Silver: 'bi-star-half', Regular: 'bi-person' };

/* ─── Main Component ──────────────────────────────────────────────────────── */
export default function Customers() {
  const { showToast } = useToast();

  /* state */
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState({ total: 0, platinum: 0, gold: 0, silver: 0, total_value: 0 });
  const [loading, setLoading] = useState(true);

  /* filters */
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [sort, setSort] = useState('id');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  /* modals / panels */
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);

  /* selected for bulk */
  const [selected, setSelected] = useState([]);

  const debSearch = useDebounce(search, 400);

  /* ── fetch ── */
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit, sort, order,
        ...(debSearch && { search: debSearch }),
        ...(filterTier && { tier: filterTier }),
      });
      const res = await api.get(`/api/customers/list?${params}`);
      const data = res.data;
      setCustomers(data.customers || []);
      setPagination(data.pagination || null);

      /* stats from current full result */
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      showToast(err?.response?.data?.error || err.message || 'Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sort, order, debSearch, filterTier]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  /* reset page when filters change */
  useEffect(() => { setPage(1); }, [debSearch, filterTier, sort, order, limit]);

  /* ── sort toggle ── */
  const toggleSort = (col) => {
    if (sort === col) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(col); setOrder('asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sort !== col) return <i className="bi bi-arrow-down-up ms-1 text-muted" style={{ fontSize: 10 }} />;
    return <i className={`bi bi-arrow-${order === 'asc' ? 'up' : 'down'} ms-1`} style={{ fontSize: 11, color: '#0D3B5E' }} />;
  };

  /* ── save ── */
  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/customers/update/${editItem.id}`, form);
        showToast('Customer updated', 'success');
      } else {
        await api.post('/api/customers/add', form);
        showToast('Customer added', 'success');
      }
      setModalShow(false);
      setEditItem(null);
      fetchCustomers();
    } catch (err) {
      showToast(err?.response?.data?.error || err.message || 'Save failed', 'error');
    }
  };

  /* ── delete ── */
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete customer "${name}"?`)) return;
    try {
      await api.post(`/api/customers/delete/${id}`);
      showToast('Customer deleted', 'success');
      fetchCustomers();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Delete failed', 'error');
    }
  };

  /* ── bulk delete ── */
  const handleBulkDelete = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} customers? This cannot be undone.`)) return;
    try {
      await Promise.all(selected.map((id) => api.post(`/api/customers/delete/${id}`)));
      showToast(`${selected.length} customers deleted`, 'success');
      setSelected([]);
      fetchCustomers();
    } catch (err) {
      showToast('Bulk delete failed', 'error');
    }
  };

  /* ── open edit ── */
  const handleEdit = async (cust) => {
    setEditItem(cust);
    setModalShow(true);
    setDetailCustomer(null);
  };

  /* ── open detail ── */
  const handleDetail = async (id) => {
    try {
      const res = await api.get(`/api/customers/get/${id}`);
      setDetailCustomer(res.data.customer);
    } catch {
      showToast('Failed to load customer', 'error');
    }
  };

  /* ── export ── */
  const handleExport = () => {
    const params = new URLSearchParams({
      ...(debSearch && { search: debSearch }),
      ...(filterTier && { tier: filterTier }),
      sort, order,
    });
    window.open(`/api/customers/export?${params}`, '_blank');
  };

  /* ── select all ── */
  const allSelected = customers.length > 0 && customers.every((c) => selected.includes(c.id));
  const toggleAll = () => {
    if (allSelected) setSelected((s) => s.filter((id) => !customers.map((c) => c.id).includes(id)));
    else setSelected((s) => [...new Set([...s, ...customers.map((c) => c.id)])]);
  };
  const toggleOne = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  /* ── derived stats (from loaded page + pagination total) ── */
  const tierCounts = customers.reduce((acc, c) => {
    acc[c.loyalty_tier] = (acc[c.loyalty_tier] || 0) + 1;
    return acc;
  }, {});
  const totalRevenue = customers.reduce((s, c) => s + (parseFloat(c.total_spent) || 0), 0);
  const grandTotal = pagination?.total || customers.length;

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">Customer Database</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={handleExport}>
            <i className="bi bi-download me-1" /> Export CSV
          </button>
          <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
            <i className="bi bi-plus-lg" /> Add Customer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-3">
        {[
          { label: 'Total Customers', value: grandTotal.toLocaleString(), cls: '', icon: 'bi-people-fill' },
          { label: 'Platinum Members', value: (tierCounts.Platinum || 0), cls: 'purple', icon: 'bi-gem' },
          { label: 'Gold Members', value: (tierCounts.Gold || 0), cls: 'accent', icon: 'bi-star-fill' },
          { label: 'Page Revenue', value: formatCurrency(totalRevenue), cls: 'success', icon: 'bi-currency-rupee' },
        ].map((k) => (
          <div className="col-6 col-md-3" key={k.label}>
            <div className={`kpi-card ${k.cls}`}>
              <div className="kpi-label"><i className={`bi ${k.icon} me-1`} />{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Bar */}
      {selected.length > 0 && (
        <div style={{
          background: '#0D3B5E', color: '#fff', borderRadius: 10, padding: '10px 20px',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontWeight: 700 }}>{selected.length} selected</span>
          <button className="btn btn-sm btn-outline-light" onClick={() => setSelected([])}>Clear</button>
          <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}>
            <i className="bi bi-trash me-1" /> Delete Selected
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by name, email, phone, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="">All Tiers</option>
          {LOYALTY_TIERS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchCustomers}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('id')}>
                      Cust # <SortIcon col="id" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
                      Name <SortIcon col="name" />
                    </th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('total_bookings')}>
                      Bookings <SortIcon col="total_bookings" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('total_spent')}>
                      Lifetime Value <SortIcon col="total_spent" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('last_travel_date')}>
                      Last Travel <SortIcon col="last_travel_date" />
                    </th>
                    <th>Tier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-5 text-muted">
                        <i className="bi bi-people" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                        No customers found.{search || filterTier ? ' Try adjusting your filters.' : ''}
                      </td>
                    </tr>
                  ) : customers.map((c) => (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        if (e.target.type === 'checkbox' || e.target.closest('button')) return;
                        handleDetail(c.id);
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(c.id)}
                          onChange={() => toggleOne(c.id)}
                        />
                      </td>
                      <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{c.customer_no}</td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ fontSize: '12px', color: '#555' }}>{c.email}</td>
                      <td>{c.phone}</td>
                      <td>{c.city}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.total_bookings}</td>
                      <td style={{ fontWeight: 700, color: '#27ae60' }}>{formatCurrency(c.total_spent)}</td>
                      <td>{formatDate(c.last_travel_date)}</td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: `${TIER_COLORS[c.loyalty_tier] || '#888'}18`,
                          color: TIER_COLORS[c.loyalty_tier] || '#888',
                          border: `1px solid ${TIER_COLORS[c.loyalty_tier] || '#888'}40`,
                        }}>
                          <i className={`bi ${TIER_ICONS[c.loyalty_tier] || 'bi-person'} me-1`} />
                          {c.loyalty_tier}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="btn-act edit" title="Edit" onClick={() => handleEdit(c)}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn-act del" title="Delete" onClick={() => handleDelete(c.id, c.name)}>
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
            />
          </>
        )}
      </div>

      {/* Customer Detail Side Panel */}
      {detailCustomer && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1040, background: 'rgba(0,0,0,0.2)' }}
            onClick={() => setDetailCustomer(null)}
          />
          <CustomerDetailPanel
            customer={detailCustomer}
            onClose={() => setDetailCustomer(null)}
            onEdit={handleEdit}
          />
        </>
      )}

      {/* Modal */}
      <CustomerModal
        show={modalShow}
        onClose={() => { setModalShow(false); setEditItem(null); }}
        onSave={handleSave}
        initial={editItem}
      />
    </div>
  );
}
