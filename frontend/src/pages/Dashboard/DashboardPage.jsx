import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Building, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSellerDashboard = location.pathname.includes('/seller');
  const roleTitle = isSellerDashboard ? 'Seller Dashboard' : 'Buyer Dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '1.5rem',
        }}
      >
        <div>
          <span className="pill-badge" style={{ marginBottom: '0.75rem' }}>
            {roleTitle}
          </span>
          <h1
            className="font-display"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 400 }}
          >
            Welcome,{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
              {user?.first_name || user?.username || 'Member'}
            </span>
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.35rem' }}>
            Manage your verified succession opportunities, NDA acknowledgements, and active negotiations.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            fontSize: '0.85rem',
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* User Information Summary Card */}
      {user && (
        <div
          className="editorial-card"
          style={{
            maxWidth: '680px',
            marginBottom: '2.5rem',
            backgroundColor: '#ffffff',
          }}
        >
          <h2
            className="font-display"
            style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 400 }}
          >
            Account Credentials & Status
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              fontSize: '0.9rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>
                Username
              </span>
              <strong style={{ color: 'var(--foreground)' }}>{user.username}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>
                Email
              </span>
              <strong style={{ color: 'var(--foreground)' }}>{user.email || '—'}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>
                Account Role
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--foreground)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                {user.role || 'BUYER'}
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>
                Verification
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: user.is_verified ? 'green' : 'var(--muted-foreground)' }}>
                <ShieldCheck size={16} />
                {user.is_verified ? 'KYC Verified' : 'Standard'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder for dashboard data */}
      <div
        style={{
          padding: '3rem 2rem',
          border: '1px dashed var(--border)',
          borderRadius: '16px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <p style={{ color: 'var(--muted-foreground)' }}>
          {isSellerDashboard
            ? 'Your business listings, buyer inquiries, and NDA requests will appear here.'
            : 'Your saved businesses, NDA requests, and deals will appear here.'}
        </p>
      </div>
    </div>
  );
}
