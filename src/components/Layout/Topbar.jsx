import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { SIDEBAR_MENU } from '../../utils/constants.js';

function getPageTitle(pathname) {
  for (const section of SIDEBAR_MENU) {
    for (const item of section.items) {
      if (item.path === pathname) return item.label;
    }
  }
  return 'SST ERP';
}

export default function Topbar({ notifCount = 0 }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const title = getPageTitle(location.pathname);
  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    showToast('Logged out successfully', 'info');
    navigate('/login');
  };

  const now = new Date();
  const currentDate = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>

      <div className="topbar-search">
        <input type="text" placeholder="Search bookings, leads, clients..." />
      </div>

      <div className="topbar-badges">
        <div className="badge-item">{currentDate}</div>
        <div className="badge-item live">
          <span className="live-dot" />
          Live Data
        </div>
      </div>

      <div className="topbar-actions">
        <Link to="/notifications" className="notification-bell">
          <i className="bi bi-bell" />
          {notifCount > 0 && (
            <span className="notification-badge">{notifCount > 99 ? '99+' : notifCount}</span>
          )}
        </Link>

        <div className="user-dropdown" ref={dropdownRef}>
          <button
            className="user-avatar"
            onClick={() => setDropdownOpen((v) => !v)}
            title={user?.name || 'User'}
          >
            {userInitials}
          </button>

          {dropdownOpen && (
            <div className="user-dropdown-menu">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#2c3e50' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {user?.email || ''} &bull; {user?.role || 'staff'}
                </div>
              </div>

              <Link to="/settings" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                <i className="bi bi-person-circle" />
                My Profile
              </Link>
              <Link to="/settings" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                <i className="bi bi-gear" />
                Settings
              </Link>
              <div className="user-dropdown-divider" />
              <button className="user-dropdown-item danger" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
