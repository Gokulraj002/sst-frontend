import api from './index.js';

export const getCommissions = (params) => api.get('/api/commissions/list', { params });
export const getCommission = (id) => api.get(`/api/commissions/get/${id}`);
export const addCommission = (data) => api.post('/api/commissions/add', data);
export const updateCommission = (id, data) => api.post(`/api/commissions/update/${id}`, data);
export const deleteCommission = (id) => api.post(`/api/commissions/delete/${id}`);
export const payCommission = (id) => api.post(`/api/commissions/pay/${id}`);
