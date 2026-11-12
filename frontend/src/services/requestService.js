import api from './api';

export const requestService = {
  // List (role-filtered by backend)
  getAll: () => api.get('/requests/'),

  // Single
  getById: (id) => api.get(`/requests/${id}/`),

  // Create (buyer submits interest)
  create: (data) => api.post('/requests/', data),

  // Seller: accept
  accept: (id, response = '') => api.post(`/requests/${id}/accept/`, { response }),

  // Seller: reject
  reject: (id, response = '') => api.post(`/requests/${id}/reject/`, { response }),

  // Upload signature
  uploadSignature: (file) => {
    const fd = new FormData();
    fd.append('signature', file);
    return api.post('/requests/upload/signature/', fd);
  },
};

export default requestService;
