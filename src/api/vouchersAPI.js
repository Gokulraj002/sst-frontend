import api from './index.js';

export const getVouchers = (params) => api.get('/api/vouchers/list', { params });
export const getVoucher = (id) => api.get(`/api/vouchers/get/${id}`);
export const addVoucher = (data) => api.post('/api/vouchers/add', data);
export const updateVoucher = (id, data) => api.post(`/api/vouchers/update/${id}`, data);
export const deleteVoucher = (id) => api.post(`/api/vouchers/delete/${id}`);
