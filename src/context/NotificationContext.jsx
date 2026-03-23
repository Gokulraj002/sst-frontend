import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig.js';

const NotificationContext = createContext({ count: 0, refresh: () => {}, decrement: () => {}, reset: () => {} });

export function NotificationProvider({ children }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications/unread_count');
      setCount(res.data?.count || 0);
    } catch { /* silently ignore */ }
  }, []);

  const decrement = useCallback((by = 1) => {
    setCount((c) => Math.max(0, c - by));
  }, []);

  const reset = useCallback(() => {
    setCount(0);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ count, refresh, decrement, reset }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
