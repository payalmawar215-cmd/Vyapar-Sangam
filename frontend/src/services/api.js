import axios from 'axios';

// Base API client configured for Django REST Framework backend
const rawBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';
const cleanBaseURL = rawBaseURL.endsWith('/') && rawBaseURL.length > 1
  ? rawBaseURL.slice(0, -1)
  : rawBaseURL;

const api = axios.create({
  baseURL: cleanBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for attaching auth token and correctly handling FormData
api.interceptors.request.use(
  (config) => {
    // If payload is FormData, do not set application/json; allow browser to set multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling global auth errors (e.g. token expired/revoked)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      // Only clear credentials if this wasn't an explicit login attempt
      if (!url.includes('/auth/login/') && !url.includes('/auth/register/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
