import React from 'react';
import { useToast } from '../../context/ToastContext.jsx';

const TOAST_ICONS = {
  success: 'bi-check-circle-fill',
  danger: 'bi-x-circle-fill',
  error: 'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

const TOAST_COLORS = {
  success: '#27ae60',
  danger: '#e74c3c',
  error: '#e74c3c',
  warning: '#f5a623',
  info: '#2980b9',
};

function ToastItem({ toast, onRemove }) {
  const type = toast.type === 'error' ? 'danger' : toast.type;
  const icon = TOAST_ICONS[toast.type] || TOAST_ICONS.info;
  const color = TOAST_COLORS[toast.type] || TOAST_COLORS.info;

  return (
    <div
      className="d-flex align-items-start gap-2 p-3 rounded shadow-sm"
      style={{
        background: 'white',
        borderLeft: `4px solid ${color}`,
        minWidth: '280px',
        maxWidth: '380px',
        marginBottom: '8px',
        animation: 'toastSlideIn 0.3s ease',
      }}
    >
      <i className={`bi ${icon}`} style={{ color, fontSize: '18px', flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1, fontSize: '13px', color: '#2c3e50', lineHeight: '1.4' }}>
        {toast.message}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#999',
          padding: '0',
          fontSize: '16px',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <i className="bi bi-x" />
      </button>
    </div>
  );
}

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
