import api from './index.js';

export const getItineraries = (params) => api.get('/api/itineraries/list', { params });
export const getItinerary = (id) => api.get(`/api/itineraries/get/${id}`);
export const addItinerary = (data) => api.post('/api/itineraries/add', data);
export const updateItinerary = (id, data) => api.post(`/api/itineraries/update/${id}`, data);
export const deleteItinerary = (id) => api.post(`/api/itineraries/delete/${id}`);
