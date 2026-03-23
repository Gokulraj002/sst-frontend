import api from './index.js';

export const getAuditLogs = (params) => api.get('/api/audit/list', { params });
export const getAuditLog = (id) => api.get(`/api/audit/get/${id}`);
