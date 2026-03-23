import api from './index.js';

export const getEmployees = (params) => api.get('/api/employees/list', { params });
export const getEmployee = (id) => api.get(`/api/employees/get/${id}`);
export const addEmployee = (data) => api.post('/api/employees/add', data);
export const updateEmployee = (id, data) => api.post(`/api/employees/update/${id}`, data);
export const deleteEmployee = (id) => api.post(`/api/employees/delete/${id}`);
