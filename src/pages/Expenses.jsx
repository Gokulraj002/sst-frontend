import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters.js';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../utils/constants.js';

function ExpenseModal({ show, onClose, onSave, initial, employees }) {
  const empty = {
    category: 'Office', description: '', amount: '', paid_by: '',
    payment_mode: 'Cash', expense_date: '', notes: '', status: 'Pending',
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
            <h5 className="modal-title">{initial?.id ? 'Edit Expense' : 'Add Expense'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={set('category')}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-md-8"><label className="form-label">Description *</label><input className="form-control" value={form.description} onChange={set('description')} /></div>
              <div className="col-md-3"><label className="form-label">Amount (₹) *</label><input type="number" className="form-control" value={form.amount} onChange={set('amount')} /></div>
              <div className="col-md-3">
                <label className="form-label">Paid By</label>
                {employees?.length > 0 ? (
                  <select className="form-select" value={form.paid_by} onChange={set('paid_by')}>
                    <option value="">— Select Staff —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input className="form-control" value={form.paid_by} onChange={set('paid_by')} placeholder="Staff name" />
                )}
              </div>
              <div className="col-md-3">
                <label className="form-label">Payment Mode</label>
                <select className="form-select" value={form.payment_mode} onChange={set('payment_mode')}>
                  {PAYMENT_MODES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-md-3"><label className="form-label">Expense Date</label><input type="date" className="form-control" value={form.expense_date} onChange={set('expense_date')} /></div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {['Pending', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>{initial?.id ? 'Update' : 'Add Expense'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get('/api/expenses/list');
      setExpenses(res.data.expenses || []);
    } catch { showToast('Failed to load expenses', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => {
    api.get('/api/employees/staff').then((r) => setEmployees(r.data.employees || [])).catch(() => {});
  }, []);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/expenses/update/${editItem.id}`, form);
        showToast('Expense updated', 'success');
      } else {
        await api.post('/api/expenses/add', form);
        showToast('Expense added', 'success');
      }
      setModalShow(false); setEditItem(null); fetchExpenses();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.post(`/api/expenses/delete/${id}`);
      showToast('Deleted', 'success'); fetchExpenses();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/expenses/get/${id}`);
      setEditItem(res.data.expense); setModalShow(true);
    } catch { showToast('Failed to load', 'error'); }
  };

  const filtered = expenses.filter((e) => {
    if (filterStatus && e.status !== filterStatus) return false;
    if (filterCat && e.category !== filterCat) return false;
    return true;
  });

  const totalAmt = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const approvedAmt = expenses.filter((e) => e.status === 'Approved').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const pendingAmt = expenses.filter((e) => e.status === 'Pending').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Expense Management</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> Add Expense
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Expenses', value: formatCurrency(totalAmt), cls: '' },
          { label: 'Approved', value: formatCurrency(approvedAmt), cls: 'success' },
          { label: 'Pending', value: formatCurrency(pendingAmt), cls: 'warning' },
          { label: 'Count', value: expenses.length, cls: 'info' },
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
          {['Pending', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchExpenses}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Exp #</th><th>Category</th><th>Description</th><th>Amount</th>
                  <th>Paid By</th><th>Mode</th><th>Date</th><th>Approved By</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-4 text-muted">No expenses found.</td></tr>
                ) : filtered.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{e.expense_no}</td>
                    <td>{e.category}</td>
                    <td>{e.description}</td>
                    <td style={{ fontWeight: 700, color: '#e74c3c' }}>{formatCurrency(e.amount)}</td>
                    <td>{e.paid_by}</td>
                    <td>{e.payment_mode}</td>
                    <td>{formatDate(e.expense_date)}</td>
                    <td>{e.approved_by || '—'}</td>
                    <td><span className={getStatusBadgeClass(e.status)}>{e.status}</span></td>
                    <td>
                      <button className="btn-act edit" onClick={() => handleEdit(e.id)}><i className="bi bi-pencil" /></button>
                      <button className="btn-act del" onClick={() => handleDelete(e.id)}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} employees={employees} />
    </div>
  );
}
