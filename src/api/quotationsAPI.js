import api from './index.js';

export const getQuotations = (params) => api.get('/api/quotations/list', { params });
export const getQuotation = (id) => api.get(`/api/quotations/get/${id}`);
export const addQuotation = (data) => api.post('/api/quotations/add', data);
export const updateQuotation = (id, data) => api.post(`/api/quotations/update/${id}`, data);
export const deleteQuotation = (id) => api.post(`/api/quotations/delete/${id}`);
