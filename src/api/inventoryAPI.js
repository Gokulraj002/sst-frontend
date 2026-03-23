import api from './index.js';

export const getInventory = (params) => api.get('/api/inventory/list', { params });
export const getInventoryItem = (id) => api.get(`/api/inventory/get/${id}`);
export const addInventoryItem = (data) => api.post('/api/inventory/add', data);
export const updateInventoryItem = (id, data) => api.post(`/api/inventory/update/${id}`, data);
export const deleteInventoryItem = (id) => api.post(`/api/inventory/delete/${id}`);
