import api from './api';

export const contactService = {
  // List user's contact exchange requests
  getAll: () => api.get('/nda/contact-exchange/'),

  // Get status for specific NDA
  getStatus: (ndaId) => api.get(`/nda/contact-exchange/status/${ndaId}/`),

  // Get status for specific Deal
  getByDeal: (dealId) => api.get(`/nda/contact-exchange/deal/${dealId}/`),

  // Initiate request (accepts ndaId number, dealId, or { deal_id, nda_id })
  request: (target) => {
    if (typeof target === 'object' && target !== null) {
      return api.post('/nda/contact-exchange/', target);
    }
    return api.post('/nda/contact-exchange/', { nda_id: target });
  },

  // Accept request (consents and reveals contacts)
  accept: (id) => api.post(`/nda/contact-exchange/${id}/accept/`),

  // Decline request
  decline: (id, reason = '') => api.post(`/nda/contact-exchange/${id}/decline/`, { reason }),

  // Cancel request
  cancel: (id) => api.post(`/nda/contact-exchange/${id}/cancel/`),
};

export default contactService;
