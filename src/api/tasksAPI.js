import api from './index.js';

export const getTasks = (params) => api.get('/api/tasks/list', { params });
export const getTask = (id) => api.get(`/api/tasks/get/${id}`);
export const addTask = (data) => api.post('/api/tasks/add', data);
export const updateTask = (id, data) => api.post(`/api/tasks/update/${id}`, data);
export const deleteTask = (id) => api.post(`/api/tasks/delete/${id}`);
export const completeTask = (id) => api.post(`/api/tasks/complete/${id}`);
