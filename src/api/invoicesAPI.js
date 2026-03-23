import api from './index.js';

export const getInvoices = (params) => api.get('/api/invoices/list', { params });
export const getInvoice = (id) => api.get(`/api/invoices/get/${id}`);
export const addInvoice = (data) => api.post('/api/invoices/add', data);
export const updateInvoice = (id, data) => api.post(`/api/invoices/update/${id}`, data);
export const deleteInvoice = (id) => api.post(`/api/invoices/delete/${id}`);
