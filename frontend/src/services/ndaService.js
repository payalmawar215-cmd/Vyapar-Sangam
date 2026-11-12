import api from './api';

export const ndaService = {
  getAll: () => api.get('/nda/'),
  getById: (id) => api.get(`/nda/${id}/`),
  acknowledge: (id) => api.post(`/nda/${id}/acknowledge/`),
};

export const dealService = {
  getAll: () => api.get('/deals/'),
  getById: (id) => api.get(`/deals/${id}/`),
  update: (id, data) => api.patch(`/deals/${id}/`, data),
};

export const favoriteService = {
  getAll: () => api.get('/favorites/'),
  toggle: (businessId) => api.post(`/favorites/toggle/${businessId}/`),
  delete: (id) => api.delete(`/favorites/${id}/`),
};

export const notificationService = {
  getAll: () => api.get('/notifications/'),
  getUnreadCount: () => api.get('/notifications/unread-count/'),
  markRead: (ids = []) => api.post('/notifications/mark-read/', { ids }),
};

export const adminService = {
  getStats: () => api.get('/auth/admin/stats/'),
  getUsers: (params = {}) => api.get('/auth/admin/users/', { params }),
  updateUser: (id, data) => api.patch(`/auth/admin/users/${id}/`, data),
  getListings: (params = {}) => api.get('/listings/', { params }),
  moderateListing: (id, status, reason = '') => {
    if (status === 'approved') return api.post(`/listings/${id}/approve/`);
    return api.post(`/listings/${id}/reject/`, { reason });
  },
  deleteListing: (id) => api.delete(`/listings/${id}/`),
};
