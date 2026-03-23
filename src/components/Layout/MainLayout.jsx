import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';

export default function MainLayout() {
  const { count: notifCount } = useNotifications();

  return (
    <>
      <Sidebar notifCount={notifCount} />
      <Topbar notifCount={notifCount} />
      <main className="main-content">
        <div className="page-section">
          <Outlet />
        </div>
      </main>
    </>
  );
}
