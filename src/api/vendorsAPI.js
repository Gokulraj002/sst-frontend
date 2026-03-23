import api from './index.js';

export const getVendors = (params) => api.get('/api/vendors/list', { params });
export const getVendor = (id) => api.get(`/api/vendors/get/${id}`);
export const addVendor = (data) => api.post('/api/vendors/add', data);
export const updateVendor = (id, data) => api.post(`/api/vendors/update/${id}`, data);
export const deleteVendor = (id) => api.post(`/api/vendors/delete/${id}`);
