import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { timeAgo } from '../utils/formatters.js';

const TYPE_ICON = {
  success: { icon: 'bi-check-circle-fill', cls: 'booking', color: '#27ae60' },
  warning: { icon: 'bi-exclamation-triangle-fill', cls: 'approval', color: '#f5a623' },
  info: { icon: 'bi-info-circle-fill', cls: 'payment', color: '#2980b9' },
  danger: { icon: 'bi-x-circle-fill', cls: 'visa', color: '#e74c3c' },
  error: { icon: 'bi-x-circle-fill', cls: 'visa', color: '#e74c3c' },
};

export default function Notifications() {
  const { showToast } = useToast();
  const { refresh: refreshCount, decrement: decrementCount, reset: resetCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRead, setFilterRead] = useState('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications/list');
      setNotifications(res.data.notifications || []);
    } catch { showToast('Failed to load notifications', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const isRead = (n) => n.is_read === true || n.is_read === 1;

  const markRead = async (id) => {
    try {
      await api.post(`/api/notifications/read/${id}`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      decrementCount(1);
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read_all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      resetCount();
      showToast('All notifications marked as read', 'success');
    } catch { showToast('Failed', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      const notif = notifications.find((n) => n.id === id);
      await api.post(`/api/notifications/delete/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notif && !isRead(notif)) decrementCount(1);
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all notifications? This cannot be undone.')) return;
    try {
      await api.post('/api/notifications/clear_all');
      setNotifications([]);
      resetCount();
      showToast('All notifications cleared', 'success');
    } catch { showToast('Failed to clear', 'error'); }
  };

  const filtered = notifications.filter((n) => {
    if (filterRead === 'unread') return !isRead(n);
    if (filterRead === 'read') return isRead(n);
    return true;
  });

  const unreadCount = notifications.filter((n) => !isRead(n)).length;

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">
          <i className="bi bi-bell me-2" style={{ color: '#f5a623' }} />Notifications
          {unreadCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: '50%', background: '#e74c3c',
              color: '#fff', fontSize: 11, fontWeight: 700, marginLeft: 8,
            }}>{unreadCount}</span>
          )}
        </h1>
        <div className="d-flex gap-2">
          {unreadCount > 0 && (
            <button className="btn-add-new" style={{ background: '#27ae60' }} onClick={markAllRead}>
              <i className="bi bi-check-all" /> Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button className="btn-act del" onClick={handleClearAll}>
              <i className="bi bi-trash" /> Clear All
            </button>
          )}
          <button className="btn-act done" onClick={fetchNotifications}>
            <i className="bi bi-arrow-clockwise" /> Refresh
          </button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Total', value: notifications.length, cls: '' },
          { label: 'Unread', value: unreadCount, cls: 'danger' },
          { label: 'Read', value: notifications.length - unreadCount, cls: 'success' },
        ].map((k) => (
          <div className="col-4" key={k.label}>
            <div className={`kpi-card ${k.cls}`}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tab-buttons mb-3">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          { key: 'read', label: 'Read' },
        ].map((t) => (
          <button key={t.key} className={`tab-btn ${filterRead === t.key ? 'active' : ''}`} onClick={() => setFilterRead(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="s-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-bell-slash" />
            <p>{filterRead === 'unread' ? 'No unread notifications.' : 'No notifications found.'}</p>
          </div>
        ) : filtered.map((n) => {
          const meta = TYPE_ICON[n.notification_type] || TYPE_ICON.info;
          const read = isRead(n);
          return (
            <div
              key={n.id}
              className={`notification-item ${!read ? 'unread' : ''}`}
              style={{ cursor: !read ? 'pointer' : 'default' }}
              onClick={() => !read && markRead(n.id)}
            >
              <div className={`notification-icon ${meta.cls}`} style={{ background: `${meta.color}15`, color: meta.color }}>
                <i className={`bi ${meta.icon}`} />
              </div>
              <div className="notification-content">
                <div className="notification-title">
                  {!read && (
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#0D3B5E',
                      display: 'inline-block', marginRight: 6, flexShrink: 0,
                    }} />
                  )}
                  {n.title}
                </div>
                <div className="notification-desc">{n.message}</div>
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <div className="notification-time">
                    <i className="bi bi-clock me-1" />{timeAgo(n.created_at)}
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '3px',
                    background: `${meta.color}20`, color: meta.color, textTransform: 'uppercase',
                  }}>
                    {n.notification_type}
                  </span>
                </div>
              </div>
              <div className="d-flex flex-column gap-1" style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
                {!read && (
                  <button
                    className="btn-act done"
                    title="Mark as read"
                    onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                  >
                    <i className="bi bi-check2" />
                  </button>
                )}
                <button
                  className="btn-act del"
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                >
                  <i className="bi bi-x" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
