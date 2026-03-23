import api from './index.js';

export const getNotifications = (params) => api.get('/api/notifications/list', { params });
export const getUnreadCount = () => api.get('/api/notifications/unread_count');
export const markAsRead = (id) => api.post(`/api/notifications/read/${id}`);
export const markAllRead = () => api.post('/api/notifications/read_all');
export const deleteNotification = (id) => api.post(`/api/notifications/delete/${id}`);
