import api from './index.js';

export const getBookings = (params) => api.get('/api/bookings/list', { params });
export const getBooking = (id) => api.get(`/api/bookings/get/${id}`);
export const addBooking = (data) => api.post('/api/bookings/add', data);
export const updateBooking = (id, data) => api.post(`/api/bookings/update/${id}`, data);
export const deleteBooking = (id) => api.post(`/api/bookings/delete/${id}`);
