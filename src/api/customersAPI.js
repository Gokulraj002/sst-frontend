import api from './index.js';

export const getCustomers = (params) => api.get('/api/customers/list', { params });
export const getCustomer = (id) => api.get(`/api/customers/get/${id}`);
export const addCustomer = (data) => api.post('/api/customers/add', data);
export const updateCustomer = (id, data) => api.post(`/api/customers/update/${id}`, data);
export const deleteCustomer = (id) => api.post(`/api/customers/delete/${id}`);
