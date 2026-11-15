import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  let navigate = null;
  try {
    navigate = useNavigate();
  } catch {
    // Fallback if rendered outside of router
    navigate = null;
  }

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser || savedUser === 'null' || savedUser === 'undefined') return null;
      const parsed = JSON.parse(savedUser);
      if (!parsed || typeof parsed !== 'object') return null;
      parsed.app_role = parsed.app_role || (parsed.role ? String(parsed.role).toLowerCase() : '');
      return parsed;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      const savedToken = localStorage.getItem('token');
      return (savedToken && savedToken !== 'null' && savedToken !== 'undefined') ? savedToken : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const checkUserAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken || savedToken === 'null' || savedToken === 'undefined') {
      setUser(null);
      setToken(null);
      return null;
    }

    try {
      const userData = await authService.getCurrentUser();
      if (!userData || typeof userData !== 'object') {
        throw new Error('Invalid user payload');
      }
      userData.app_role = userData.app_role || (userData.role ? String(userData.role).toLowerCase() : '');
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      console.warn("Session check failed or expired:", err?.response?.status || err?.message);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken && savedToken !== 'null' && savedToken !== 'undefined') {
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
    if (data?.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      if (data.user && typeof data.user === 'object') {
        data.user.app_role = data.user.app_role || (data.user.role ? String(data.user.role).toLowerCase() : '');
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
    if (data?.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      if (data.user && typeof data.user === 'object') {
        data.user.app_role = data.user.app_role || (data.user.role ? String(data.user.role).toLowerCase() : '');
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
    if (updated && typeof updated === 'object') {
      updated.app_role = updated.app_role || (updated.role ? String(updated.role).toLowerCase() : '');
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
    return updated;
  };

  /**
   * Update role
   */
  const updateRole = async (role) => {
    const updated = await authService.updateRole(role);
    if (updated && typeof updated === 'object') {
      updated.app_role = updated.app_role || (updated.role ? String(updated.role).toLowerCase() : '');
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
    return updated;
  };

  /**
   * Logout user and cleanly redirect to specified route (default /login)
   */
  const logout = async (redirectTo = '/login') => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      if (redirectTo) {
        if (navigate) {
          navigate(redirectTo, { replace: true });
        } else {
          window.location.href = redirectTo;
        }
      }
    }
  };

  /**
   * Safe navigation to login with return_to preservation
   */
  const navigateToLogin = useCallback((returnUrl = '/') => {
    const targetUrl = `/login?return_to=${encodeURIComponent(returnUrl)}`;
    if (navigate) {
      navigate(targetUrl, { replace: true });
    } else {
      window.location.href = targetUrl;
    }
  }, [navigate]);

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
