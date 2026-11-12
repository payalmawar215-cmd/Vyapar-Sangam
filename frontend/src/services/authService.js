import api from './api';

export const authService = {
  /**
   * Register a new user with { username, email, full_name, password, password_confirm, role }
   * Returns { token, user, message }
   */
  register: async (userData) => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },

  /**
   * Log in user with credentials { username, password }
   * Returns { token, user, message }
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  },

  /**
   * Retrieve the currently authenticated user's profile
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/profile/');
    return response.data;
  },

  /**
   * Update the user profile (city, organization, bio, phone, role, etc.)
   */
  updateProfile: async (data) => {
    const response = await api.patch('/auth/profile/', data);
    return response.data;
  },

  /**
   * Change user role (buyer, seller, admin)
   */
  updateRole: async (role) => {
    const response = await api.patch('/auth/profile/', { role, app_role: role });
    return response.data;
  },

  /**
   * Change password for logged in user
   */
  changePassword: async (data) => {
    const response = await api.post('/auth/change-password/', data);
    return response.data;
  },

  /**
   * Send password reset request
   */
  forgotPassword: async (email) => {
    const response = await api.post('/auth/password-reset/', { email });
    return response.data;
  },

  /**
   * Confirm password reset with token
   * Accepts { token, resetToken, password, new_password, newPassword }
   */
  resetPassword: async ({ token, resetToken, password, new_password, newPassword }) => {
    const pwd = password || new_password || newPassword;
    const tok = token || resetToken;
    const response = await api.post('/auth/password-reset-confirm/', {
      token: tok,
      password: pwd,
      new_password: pwd,
      newPassword: pwd,
    });
    return response.data;
  },

  /**
   * Log out user: revoke token on backend and remove from local storage
   */
  logout: async () => {
    try {
      await api.post('/auth/logout/');
    } catch {
      // Continue even if network fails
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  /**
   * Platform Settings
   */
  getPlatformSettings: async () => {
    const response = await api.get('/settings/');
    return response.data;
  },

  updatePlatformSettings: async (data) => {
    const response = await api.patch('/settings/', data);
    return response.data;
  },

  uploadVideo: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const response = await api.post('/settings/upload/video/', fd);
    return response.data;
  },

  uploadPoster: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const response = await api.post('/settings/upload/poster/', fd);
    return response.data;
  },
};

export default authService;
