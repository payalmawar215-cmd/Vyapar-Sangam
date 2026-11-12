import api from './api';

export const meetingService = {
  // List user's meetings (role-filtered)
  getAll: (params = {}) => api.get('/meetings/', { params }),

  // Eligible deals for meeting scheduling
  getEligibleDeals: () => api.get('/meetings/eligible-deals/'),

  // Single meeting
  getById: (id) => api.get(`/meetings/${id}/`),

  // Create meeting request
  create: (data) => api.post('/meetings/', data),

  // Seller accepts
  accept: (id, data = {}) => api.post(`/meetings/${id}/accept/`, data),

  // Seller rejects
  reject: (id, reason = '') => api.post(`/meetings/${id}/reject/`, { reason }),

  // Seller proposes reschedule
  proposeReschedule: (id, data) => api.post(`/meetings/${id}/propose-reschedule/`, data),

  // Buyer accepts reschedule
  acceptReschedule: (id) => api.post(`/meetings/${id}/accept-reschedule/`),

  // Buyer or Seller cancels
  cancel: (id, reason = '') => api.post(`/meetings/${id}/cancel/`, { reason }),

  // Complete meeting
  complete: (id) => api.post(`/meetings/${id}/complete/`),
};

export default meetingService;
