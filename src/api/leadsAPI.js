import api from './index.js';

export const getLeads = (params) => api.get('/api/leads/list', { params });
export const getLead = (id) => api.get(`/api/leads/get/${id}`);
export const addLead = (data) => api.post('/api/leads/add', data);
export const updateLead = (id, data) => api.post(`/api/leads/update/${id}`, data);
export const deleteLead = (id) => api.post(`/api/leads/delete/${id}`);
