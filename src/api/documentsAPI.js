import api from './index.js';

export const getDocuments = (params) => api.get('/api/documents/list', { params });
export const getDocument = (id) => api.get(`/api/documents/get/${id}`);
export const addDocument = (data) => api.post('/api/documents/add', data);
export const updateDocument = (id, data) => api.post(`/api/documents/update/${id}`, data);
export const deleteDocument = (id) => api.post(`/api/documents/delete/${id}`);
