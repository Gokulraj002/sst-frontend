import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SIDEBAR_MENU } from '../../utils/constants.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function Sidebar({ notifCount = 0 }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'info');
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <span>SST</span> ERP
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginTop: '2px' }}>
          Tours & Travels Management
        </div>
      </div>
      <div className="sidebar-nav">
        {SIDEBAR_MENU.map((section) => (
          <div className="nav-section" key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <div className={`nav-item ${isActive ? 'active' : ''}`} key={item.path}>
                  <Link to={item.path} className="nav-link-item">
                    <i className={`bi ${item.icon}`} />
                    <span>{item.label}</span>
                    {item.badge && notifCount > 0 && (
                      <span className="nav-badge">{notifCount > 99 ? '99+' : notifCount}</span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Info + Logout */}
      <div className="sidebar-footer" style={{ padding: '12px 14px', textAlign: 'left' }}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#f5a623', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '12px', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>
              {user?.role || 'staff'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '6px 10px',
            background: 'rgba(231,76,60,0.15)', color: '#ff8a80',
            border: '1px solid rgba(231,76,60,0.3)', borderRadius: '6px',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(231,76,60,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(231,76,60,0.15)'; }}
        >
          <i className="bi bi-box-arrow-right" />
          Logout
        </button>
      </div>
    </nav>
  );
}
