import api from './index.js';

export const getVendorPayments = (params) => api.get('/api/vendorpay/list', { params });
export const getVendorPayment = (id) => api.get(`/api/vendorpay/get/${id}`);
export const addVendorPayment = (data) => api.post('/api/vendorpay/add', data);
export const updateVendorPayment = (id, data) => api.post(`/api/vendorpay/update/${id}`, data);
export const deleteVendorPayment = (id) => api.post(`/api/vendorpay/delete/${id}`);
