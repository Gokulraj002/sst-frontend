import api from './index.js';

export const getApprovals = (params) => api.get('/api/approvals/list', { params });
export const getApproval = (id) => api.get(`/api/approvals/get/${id}`);
export const approveRequest = (id, remarks) => api.post(`/api/approvals/approve/${id}`, { remarks });
export const rejectRequest = (id, remarks) => api.post(`/api/approvals/reject/${id}`, { remarks });
export const addApproval = (data) => api.post('/api/approvals/add', data);
