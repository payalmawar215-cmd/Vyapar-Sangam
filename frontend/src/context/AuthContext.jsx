import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      // Ensure app_role is available as lowercase
      parsed.app_role = parsed.app_role || (parsed.role ? parsed.role.toLowerCase() : '');
      return parsed;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  const checkUserAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      return null;
    }
    try {
      const userData = await authService.getCurrentUser();
      userData.app_role = userData.app_role || (userData.role ? userData.role.toLowerCase() : '');
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      checkUserAuth().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [checkUserAuth]);

  /**
   * Register a new user
   */
  const registerUser = async (userData) => {
    const data = await authService.register(userData);
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      if (data.user) {
        data.user.app_role = data.user.app_role || (data.user.role ? data.user.role.toLowerCase() : '');
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      }
    }
    return data;
  };

  /**
   * Log in user using credentials, store auth token and profile
   */
  const loginUser = async (credentials) => {
    const data = await authService.login(credentials);
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      if (data.user) {
        data.user.app_role = data.user.app_role || (data.user.role ? data.user.role.toLowerCase() : '');
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      }
    }
    return data;
  };

  /**
   * Update current user profile
   */
  const updateMe = async (data) => {
    const updated = await authService.updateProfile(data);
    updated.app_role = updated.app_role || (updated.role ? updated.role.toLowerCase() : '');
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    return updated;
  };

  /**
   * Update role
   */
  const updateRole = async (role) => {
    const updated = await authService.updateRole(role);
    updated.app_role = updated.app_role || (updated.role ? updated.role.toLowerCase() : '');
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    return updated;
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  const navigateToLogin = (returnUrl = '/') => {
    window.location.href = `/login?return_to=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoadingAuth: loading,
        registerUser,
        loginUser,
        updateMe,
        updateRole,
        checkUserAuth,
        logout,
        navigateToLogin,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
