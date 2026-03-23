import api from './index.js';

export const getSettings = () => api.get('/api/settings/get');
export const saveSettings = (data) => api.post('/api/settings/save', data);
