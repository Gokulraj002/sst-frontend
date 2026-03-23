import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../utils/formatters.js';

export default function Audit() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [modules, setModules] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [stats, setStats] = useState({ total: 0, today: 0, by_module: [] });

  const fetchLogs = useCallback(async (mod = filterModule, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mod) params.set('module', mod);
      if (q) params.set('search', q);
      params.set('limit', '200');
      const res = await api.get(`/api/audit/list?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setModules(res.data.modules || []);
    } catch { showToast('Failed to load audit logs', 'error'); }
    finally { setLoading(false); }
  }, [filterModule, search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/api/audit/stats');
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLogs(filterModule, search);
    fetchStats();
  }, [filterModule, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(filterModule, searchInput);
    // eslint-disable-next-line
    setSearch(searchInput);
  };

  const handleModuleChange = (mod) => {
    setFilterModule(mod);
    fetchLogs(mod, search);
  };

  const getActionColor = (action) => {
    const a = action?.toLowerCase() || '';
    if (a.includes('delete') || a.includes('reject')) return '#e74c3c';
    if (a.includes('create') || a.includes('add')) return '#27ae60';
    if (a.includes('update') || a.includes('edit')) return '#2980b9';
    if (a.includes('login') || a.includes('logout')) return '#8e44ad';
    if (a.includes('approve')) return '#27ae60';
    return '#888';
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">
          <i className="bi bi-shield-check me-2" style={{ color: '#f5a623' }} />Audit Logs
        </h1>
        <button className="btn-act done" onClick={() => { fetchLogs(); fetchStats(); }}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-3">
        {[
          { label: 'Total Events', value: stats.total || logs.length, cls: '' },
          { label: 'Today', value: stats.today || logs.filter((l) => l.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length, cls: 'info' },
          { label: 'Modules Tracked', value: modules.length, cls: 'success' },
          { label: 'Showing', value: logs.length, cls: 'warning' },
        ].map((k) => (
          <div className="col-6 col-md-3" key={k.label}>
            <div className={`kpi-card ${k.cls}`}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input
            type="text"
            placeholder="Search by action, user, details..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <button type="submit" className="btn-act done">
            <i className="bi bi-search" />
          </button>
          {search && (
            <button type="button" className="btn-act" onClick={() => { setSearch(''); setSearchInput(''); fetchLogs(filterModule, ''); }}>
              <i className="bi bi-x" /> Clear
            </button>
          )}
        </form>
        <select value={filterModule} onChange={(e) => handleModuleChange(e.target.value)}>
          <option value="">All Modules</option>
          {modules.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <span style={{ fontSize: '12px', color: '#888' }}>
          {total > logs.length ? `Showing ${logs.length} of ${total}` : `${logs.length} records`}
        </span>
      </div>

      <div className="s-card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Performed By</th>
                  <th>Details</th>
                  <th>IP Address</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">No audit logs found.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: '#aaa', fontSize: '11px' }}>{log.id}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                        background: `${getActionColor(log.action)}20`,
                        color: getActionColor(log.action),
                        whiteSpace: 'nowrap',
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                        background: '#e7f3ff', color: '#2980b9',
                      }}>
                        {log.module}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.performed_by}</td>
                    <td style={{ fontSize: '12px', color: '#555', maxWidth: 300 }}>{log.details}</td>
                    <td style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>{log.ip_address}</td>
                    <td style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>{timeAgo(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity by Module */}
      {stats.by_module && stats.by_module.length > 0 && (
        <div className="s-card mt-3">
          <div className="s-card-title"><i className="bi bi-bar-chart-steps" />Activity by Module</div>
          <div className="row g-2">
            {stats.by_module.map((m) => (
              <div className="col-6 col-md-4 col-lg-3" key={m.module}>
                <div
                  style={{
                    padding: '10px 14px', borderRadius: 8, background: '#f8f9fa',
                    border: '1px solid #e2e8f0', cursor: 'pointer',
                  }}
                  onClick={() => handleModuleChange(m.module)}
                >
                  <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>{m.module}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0D3B5E' }}>{m.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
