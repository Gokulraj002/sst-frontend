import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '100vh', background: '#f5f7fa' }}
      >
        <div className="text-center">
          <div
            className="spinner-border mb-3"
            role="status"
            style={{ color: '#0D3B5E', width: '3rem', height: '3rem' }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <div style={{ color: '#0D3B5E', fontWeight: 600, fontSize: '14px' }}>
            SST ERP — Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
