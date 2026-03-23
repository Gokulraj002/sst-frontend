import api from './index.js';

export const getVisas = (params) => api.get('/api/visa/list', { params });
export const getVisa = (id) => api.get(`/api/visa/get/${id}`);
export const addVisa = (data) => api.post('/api/visa/add', data);
export const updateVisa = (id, data) => api.post(`/api/visa/update/${id}`, data);
export const deleteVisa = (id) => api.post(`/api/visa/delete/${id}`);
