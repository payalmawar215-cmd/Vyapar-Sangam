import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  ShoppingBag,
  Check,
  CheckCircle2,
} from 'lucide-react';
import './Auth.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerUser, login, isAuthenticated, user } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'BUYER', // BUYER or SELLER
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState(null);

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = user.role === 'SELLER' ? '/seller' : '/buyer';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleRoleSelect = (selectedRole) => {
    setFormData((prev) => ({
      ...prev,
      role: selectedRole,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Client-side validation
    const fullNameTrimmed = formData.fullName.trim();
    const usernameTrimmed = formData.username.trim();
    const emailTrimmed = formData.email.trim();

    if (!fullNameTrimmed) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!usernameTrimmed) {
      setErrorMessage('Please choose a username.');
      return;
    }
    if (usernameTrimmed.length < 3) {
      setErrorMessage('Username must be at least 3 characters long.');
      return;
    }
    if (!emailTrimmed) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Please provide a password.');
      return;
    }
    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      // Connect to Django backend: POST /api/auth/register/
      const result = await registerUser({
        full_name: fullNameTrimmed,
        username: usernameTrimmed,
        email: emailTrimmed,
        role: formData.role,
        password: formData.password,
        password_confirm: formData.confirmPassword,
      });

      // Save registration state so user can either sign in or proceed
      setRegisteredSuccess({
        token: result.token,
        user: result.user,
        username: usernameTrimmed,
        role: formData.role,
        fullName: fullNameTrimmed,
      });
    } catch (err) {
      let message = 'Unable to complete registration. Please check the details and try again.';

      if (err.response) {
        const data = err.response.data;
        if (typeof data === 'string') {
          message = data;
        } else if (data?.error) {
          message = data.error;
        } else if (data?.details) {
          // Flatten first specific field error
          const details = data.details;
          const firstKey = Object.keys(details)[0];
          if (firstKey && Array.isArray(details[firstKey])) {
            message = details[firstKey][0];
          } else if (typeof details === 'string') {
            message = details;
          }
        } else if (data?.email?.[0]) {
          message = data.email[0];
        } else if (data?.username?.[0]) {
          message = data.username[0];
        } else if (data?.password?.[0]) {
          message = data.password[0];
        }
      } else if (err.request) {
        message = 'Cannot connect to backend server. Please verify the Django server is running.';
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  // Handler to navigate user to login with username pre-filled
  const handleProceedToLogin = () => {
    navigate('/login', {
      state: {
        registeredMessage: 'Your account has been created successfully! Please sign in with your credentials.',
        username: registeredSuccess?.username,
      },
    });
  };

  // Handler to directly access dashboard with created credentials
  const handleDirectDashboard = () => {
    if (registeredSuccess?.token && registeredSuccess?.user) {
      login(registeredSuccess.token, registeredSuccess.user);
      const target = registeredSuccess.user.role === 'SELLER' ? '/seller' : '/buyer';
      navigate(target, { replace: true });
    } else {
      navigate('/login');
    }
  };

  // If registration was successful, render the success confirmation view
  if (registeredSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-container register-container">
          <div className="auth-card">
            <div className="success-card-content">
              <div className="success-icon-badge">
                <CheckCircle2 size={36} />
              </div>
              <span className="auth-eyebrow">Registration Successful</span>
              <h1 className="auth-title">
                Welcome to <span>Vyapar Sangam</span>
              </h1>
              <p className="auth-subtitle" style={{ maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                Your account for <strong>{registeredSuccess.fullName}</strong> has been created as a{' '}
                <strong>{registeredSuccess.role === 'SELLER' ? 'Business Seller' : 'Business Buyer'}</strong>.
              </p>

              <div className="success-actions">
                <button
                  type="button"
                  onClick={handleProceedToLogin}
                  className="auth-submit-btn"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <span>Sign In to Your Account</span>
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={handleDirectDashboard}
                  className="btn btn-outline"
                  style={{ borderRadius: '9999px', padding: '0.875rem' }}
                >
                  <span>Enter {registeredSuccess.role === 'SELLER' ? 'Seller' : 'Buyer'} Dashboard Directly</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container register-container">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            <span className="auth-eyebrow">Create An Account</span>
            <h1 className="auth-title">
              Join the <span>Sangam</span>
            </h1>
            <p className="auth-subtitle">
              Join India's dedicated marketplace for business succession and acquisitions.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Registration Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Account Type Selection (Buyer or Seller) */}
            <div className="role-selection-wrapper">
              <label className="role-selection-label">Select Your Account Type</label>
              <div className="role-selector-grid">
                {/* Buyer Card */}
                <div
                  className={`role-card-option ${formData.role === 'BUYER' ? 'active' : ''}`}
                  onClick={() => handleRoleSelect('BUYER')}
                  tabIndex={0}
                  role="radio"
                  aria-checked={formData.role === 'BUYER'}
                >
                  <div className="role-card-header">
                    <ShoppingBag size={20} className="role-card-icon" />
                    <div className="role-check-indicator">
                      {formData.role === 'BUYER' && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                  <div className="role-card-title">I Want to Buy</div>
                  <div className="role-card-desc">
                    Explore verified businesses, sign NDAs, and acquire established enterprises.
                  </div>
                </div>

                {/* Seller Card */}
                <div
                  className={`role-card-option ${formData.role === 'SELLER' ? 'active' : ''}`}
                  onClick={() => handleRoleSelect('SELLER')}
                  tabIndex={0}
                  role="radio"
                  aria-checked={formData.role === 'SELLER'}
                >
                  <div className="role-card-header">
                    <Briefcase size={20} className="role-card-icon" />
                    <div className="role-check-indicator">
                      {formData.role === 'SELLER' && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                  <div className="role-card-title">I Want to Sell</div>
                  <div className="role-card-desc">
                    Confidentially list your business and connect with qualified successors.
                  </div>
                </div>
              </div>
            </div>

            {/* Two-Column Grid: Full Name & Username */}
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">
                  Full Name
                </label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <User size={18} />
                  </span>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    className="auth-input"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <AtSign size={18} />
                  </span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    placeholder="e.g. rajesh_kumar"
                    className="auth-input"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  className="auth-input"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Two-Column Grid: Password & Confirm Password */}
            <div className="form-grid-2">
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
                    autoComplete="new-password"
                    required
                    placeholder="At least 8 chars"
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

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Lock size={18} />
                  </span>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Re-enter password"
                    className="auth-input has-toggle"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    tabIndex={0}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={
                loading ||
                !formData.fullName.trim() ||
                !formData.username.trim() ||
                !formData.email.trim() ||
                !formData.password ||
                !formData.confirmPassword
              }
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="btn-spinner" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Continue</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Navigation to Login */}
          <div className="auth-card-footer">
            <span>Already have an account?</span>
            <Link to="/login" className="auth-switch-link">
              Sign In
            </Link>
          </div>
        </div>

        {/* Security & Confidentiality Tagline */}
        <div className="auth-trust-note">
          <ShieldCheck size={14} color="var(--accent)" />
          <span>Encrypted data & strict confidentiality protocols standard on all accounts</span>
        </div>
      </div>
    </div>
  );
}
