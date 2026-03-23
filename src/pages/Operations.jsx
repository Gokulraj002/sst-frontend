import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, getStatusBadgeClass } from '../utils/formatters.js';

const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const TASK_STATUSES = ['Pending', 'In Progress', 'Done'];

function TaskModal({ show, onClose, onSave, initial, employees }) {
  const empty = { task: '', related_to: '', assigned_to: '', priority: 'Medium', due_date: '', status: 'Pending', notes: '' };
  const [form, setForm] = useState(empty);
  useEffect(() => {
    if (initial) setForm({ ...empty, ...initial, due_date: initial.due_date ? String(initial.due_date).split('T')[0] : '' });
    else setForm(empty);
  }, [initial, show]);

  if (!show) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">{initial?.id ? 'Edit Task' : 'Add Task'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Task *</label>
              <input className="form-control" value={form.task} onChange={set('task')} />
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Related To</label>
                <input className="form-control" value={form.related_to} onChange={set('related_to')} placeholder="Booking/Lead ref" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Assigned To</label>
                {employees?.length > 0 ? (
                  <select className="form-select" value={form.assigned_to} onChange={set('assigned_to')}>
                    <option value="">— Select Staff —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input className="form-control" value={form.assigned_to} onChange={set('assigned_to')} placeholder="Staff name" />
                )}
              </div>
              <div className="col-md-4">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={set('priority')}>
                  {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-control" value={form.due_date} onChange={set('due_date')} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(form)}>
              {initial?.id ? 'Update' : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Operations() {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [employees, setEmployees] = useState([]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/api/tasks/list');
      setTasks(res.data.tasks || []);
    } catch { showToast('Failed to load tasks', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    api.get('/api/employees/staff').then((r) => setEmployees(r.data.employees || [])).catch(() => {});
  }, []);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/tasks/update/${editItem.id}`, form);
        showToast('Task updated', 'success');
      } else {
        await api.post('/api/tasks/add', form);
        showToast('Task added', 'success');
      }
      setModalShow(false); setEditItem(null); fetchTasks();
    } catch (err) { showToast(err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.post(`/api/tasks/delete/${id}`);
      showToast('Task deleted', 'success'); fetchTasks();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/api/tasks/get/${id}`);
      setEditItem(res.data.task); setModalShow(true);
    } catch { showToast('Failed to load task', 'error'); }
  };

  const handleComplete = async (id) => {
    try {
      await api.post(`/api/tasks/update/${id}`, { status: 'Done' });
      showToast('Task marked as Done', 'success'); fetchTasks();
    } catch { showToast('Failed', 'error'); }
  };

  const filtered = filterStatus ? tasks.filter((t) => t.status === filterStatus) : tasks;
  const overdue = tasks.filter((t) => t.status !== 'Done' && t.due_date && new Date(t.due_date) < new Date()).length;

  const priorityColor = { High: '#e74c3c', Medium: '#f5a623', Low: '#27ae60', Urgent: '#8e44ad' };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Operations Center</h1>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> Add Task
        </button>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total Tasks', value: tasks.length, cls: '' },
          { label: 'In Progress', value: tasks.filter((t) => t.status === 'In Progress').length, cls: 'info' },
          { label: 'Overdue', value: overdue, cls: 'danger' },
          { label: 'Completed', value: tasks.filter((t) => t.status === 'Done').length, cls: 'success' },
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
          {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <button className="btn-act done" onClick={fetchTasks}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Related To</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">No tasks found.</td></tr>
                ) : filtered.map((t) => {
                  const isOverdue = t.status !== 'Done' && t.due_date && new Date(t.due_date) < new Date();
                  return (
                    <tr key={t.id} style={{ opacity: t.status === 'Done' ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 600, maxWidth: 280 }}>
                        {isOverdue && <i className="bi bi-exclamation-triangle-fill text-danger me-1" />}
                        {t.status === 'Done' && <i className="bi bi-check-circle-fill text-success me-1" />}
                        {t.task}
                        {t.notes && <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{t.notes}</div>}
                      </td>
                      <td>{t.related_to}</td>
                      <td>{t.assigned_to}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          background: `${priorityColor[t.priority] || '#888'}20`,
                          color: priorityColor[t.priority] || '#888',
                        }}>
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ color: isOverdue ? '#e74c3c' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>
                        {formatDate(t.due_date)}
                      </td>
                      <td><span className={getStatusBadgeClass(t.status)}>{t.status}</span></td>
                      <td>
                        {t.status !== 'Done' && (
                          <button className="btn-act done" onClick={() => handleComplete(t.id)} title="Mark Done">
                            <i className="bi bi-check" />
                          </button>
                        )}
                        <button className="btn-act edit" onClick={() => handleEdit(t.id)}><i className="bi bi-pencil" /></button>
                        <button className="btn-act del" onClick={() => handleDelete(t.id)}><i className="bi bi-trash" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TaskModal show={modalShow} onClose={() => { setModalShow(false); setEditItem(null); }} onSave={handleSave} initial={editItem} employees={employees} />
    </div>
  );
}
