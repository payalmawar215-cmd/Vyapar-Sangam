import api from './api';

// ─── Listings ───────────────────────────────────────────────────────────────

export const listingService = {
  // Public browse with filters
  getAll: (params = {}) => api.get('/listings/', { params }),

  // Single listing
  getById: (id) => api.get(`/listings/${id}/`),

  // Seller: my listings
  getMyListings: () => api.get('/listings/my/'),

  // Create (seller)
  create: (data) => api.post('/listings/', data),

  // Update (owner or admin)
  update: (id, data) => api.patch(`/listings/${id}/`, data),

  // Delete
  delete: (id) => api.delete(`/listings/${id}/`),

  // Admin: approve / reject
  approve: (id) => api.post(`/listings/${id}/approve/`),
  reject: (id, reason, feedback = '', status = 'rejected') =>
    api.post(`/listings/${id}/reject/`, { reason, feedback, status }),

  // Seller: resubmit for approval
  resubmit: (id, note = '') => api.post(`/listings/${id}/resubmit/`, { note }),

  // Business Verification
  uploadVerificationDoc: (id, file, docType = 'business_registration', title = '') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', docType);
    if (title) fd.append('title', title);
    return api.post(`/listings/${id}/verification/upload/`, fd);
  },
  deleteVerificationDoc: (listingId, docId) =>
    api.delete(`/listings/${listingId}/verification/documents/${docId}/`),
  submitVerification: (id) => api.post(`/listings/${id}/verification/submit/`),
  reviewVerification: (id, status, feedback = '', notes = '') =>
    api.post(`/listings/${id}/verification/review/`, { status, feedback, notes }),
  getAdminVerifications: (params = {}) =>
    api.get('/listings/verifications/', { params }),

  // Upload single image
  uploadImage: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/listings/upload/image/', fd);
  },

  // Upload multiple images in a single batch
  uploadImages: (files) => {
    const fd = new FormData();
    Array.from(files).forEach((file) => {
      fd.append('images', file);
    });
    return api.post('/listings/upload/image/', fd);
  },
};

// ─── Categories ─────────────────────────────────────────────────────────────

export const categoryService = {
  getAll: () => api.get('/categories/'),
  create: (data) => api.post('/categories/', data),
  update: (id, data) => api.put(`/categories/${id}/`, data),
  delete: (id) => api.delete(`/categories/${id}/`),
};

export default listingService;
