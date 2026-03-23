import api from './index.js';

export const getUsers = (params) => api.get('/api/users/list', { params });
export const getUser = (id) => api.get(`/api/users/get/${id}`);
export const addUser = (data) => api.post('/api/users/add', data);
export const updateUser = (id, data) => api.post(`/api/users/update/${id}`, data);
export const deleteUser = (id) => api.post(`/api/users/delete/${id}`);
