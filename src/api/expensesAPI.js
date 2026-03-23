import api from './index.js';

export const getExpenses = (params) => api.get('/api/expenses/list', { params });
export const getExpense = (id) => api.get(`/api/expenses/get/${id}`);
export const addExpense = (data) => api.post('/api/expenses/add', data);
export const updateExpense = (id, data) => api.post(`/api/expenses/update/${id}`, data);
export const deleteExpense = (id) => api.post(`/api/expenses/delete/${id}`);
export const approveExpense = (id) => api.post(`/api/expenses/approve/${id}`);
