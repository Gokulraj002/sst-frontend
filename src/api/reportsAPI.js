import api from './index.js';

export const getReportsSummary = (params) => api.get('/api/reports/summary', { params });
export const getRevenueReport = (params) => api.get('/api/reports/revenue', { params });
export const getLeadReport = (params) => api.get('/api/reports/leads', { params });
export const getBookingReport = (params) => api.get('/api/reports/bookings', { params });
