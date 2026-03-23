import api from './index.js';

export const getRefunds = (params) => api.get('/api/refunds/list', { params });
export const getRefund = (id) => api.get(`/api/refunds/get/${id}`);
export const addRefund = (data) => api.post('/api/refunds/add', data);
export const updateRefund = (id, data) => api.post(`/api/refunds/update/${id}`, data);
export const deleteRefund = (id) => api.post(`/api/refunds/delete/${id}`);
