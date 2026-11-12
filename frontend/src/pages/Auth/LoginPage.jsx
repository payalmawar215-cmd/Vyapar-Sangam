import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import './Auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser, isAuthenticated, user } = useAuth();

  // Destination redirect path (if user was trying to access a specific page)
  const redirectFrom = location.state?.from?.pathname;
  const initialUsername = location.state?.username || '';
  const initialSuccessMessage = location.state?.registeredMessage || '';

  // Form state
  const [formData, setFormData] = useState({
    username: initialUsername,
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBanner, setSuccessBanner] = useState(initialSuccessMessage);

  // Determine correct dashboard based on user role (ADMIN -> /admin, SELLER -> /seller, BUYER -> /buyer)
  const getDashboardRoute = (userOrRole) => {
    if (!userOrRole) return '/buyer';
    const role = typeof userOrRole === 'string' ? userOrRole : (userOrRole?.role || userOrRole?.app_role || '');
    const normalizedRole = (role || '').toUpperCase();
    const isStaffOrSuper = typeof userOrRole === 'object' && (userOrRole?.is_staff || userOrRole?.is_superuser);

    if (normalizedRole === 'ADMIN' || isStaffOrSuper || role.toLowerCase() === 'admin') return '/admin';
    if (normalizedRole === 'SELLER') return '/seller';
    if (normalizedRole === 'BUYER') return '/buyer';
    return '/buyer';
  };

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = redirectFrom || getDashboardRoute(user);
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate, redirectFrom]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear alerts when user starts typing
    if (errorMessage) {
      setErrorMessage('');
    }
    if (successBanner) {
      setSuccessBanner('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessBanner('');

    // Client-side validation
    const trimmedLogin = formData.username.trim();
    if (!trimmedLogin) {
      setErrorMessage('Please enter your email or username.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // Connects to Django backend: POST /api/auth/login/
      const result = await loginUser({
        username: trimmedLogin,
        password: formData.password,
      });

      // Redirect user to their designated dashboard or previous page
      const targetPath = redirectFrom || getDashboardRoute(result?.user);
      navigate(targetPath, { replace: true });
    } catch (err) {
      // Extract human-readable error from backend response
      let message = 'Unable to sign in. Please verify your credentials and try again.';

      if (err.response) {
        const data = err.response.data;
        if (typeof data === 'string') {
          message = data;
        } else if (data?.error) {
          message = data.error;
        } else if (data?.detail) {
          message = data.detail;
        } else if (data?.non_field_errors?.[0]) {
          message = data.non_field_errors[0];
        } else if (err.response.status === 401) {
          message = 'Invalid username/email or password.';
        } else if (err.response.status >= 500) {
          message = 'Server temporarily unavailable. Please try again in a few moments.';
        }
      } else if (err.request) {
        message = 'Cannot connect to backend server. Please ensure the Django server is running on port 8000.';
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            <span className="auth-eyebrow">Secure Platform Access</span>
            <h1 className="auth-title">
              Sign in to <span>Vyapar Sangam</span>
            </h1>
            <p className="auth-subtitle">
              Access your confidential buyer or seller dashboard, deals, and active inquiries.
            </p>
          </div>

          {/* Success Banner (e.g., after newly registering) */}
          {successBanner && (
            <div className="auth-success-banner" role="status">
              <CheckCircle2 size={18} />
              <span>{successBanner}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Username or Email Input */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Email or Username
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="name@company.com or username"
                  className="auth-input"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className="auth-input has-toggle"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Helper Options Row */}
            <div className="form-options-row">
              <label className="remember-me">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>

              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || !formData.username.trim() || !formData.password}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="btn-spinner" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Register Prompt */}
          <div className="auth-card-footer">
            <span>Don't have an account yet?</span>
            <Link to="/register" className="auth-switch-link">
              Create an Account
            </Link>
          </div>
        </div>

        {/* Security & Confidentiality Tagline */}
        <div className="auth-trust-note">
          <ShieldCheck size={14} color="var(--accent)" />
          <span>Confidential transactions & digital NDA protection standard on all accounts</span>
        </div>
      </div>
    </div>
  );
}
