import api from './index.js';

export const getStats = () => api.get('/api/dashboard/stats');
export const getDashboard = () => api.get('/api/dashboard');
