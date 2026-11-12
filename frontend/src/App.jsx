import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import RequireRole from './components/common/RequireRole';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './lib/ToastContext';

// Public pages
import HomePage from './pages/Home/HomePage';
import ListingsPage from './pages/Listings/ListingsPage';
import HowItWorksPage from './pages/HowItWorks/HowItWorksPage';
import AboutPage from './pages/About/AboutPage';
import BusinessDetailPage from './pages/BusinessDetail/BusinessDetailPage';
import BuyRequestForm from './pages/BuyRequest/BuyRequestForm';
import RoleSelectPage from './pages/RoleSelect/RoleSelectPage';

// Auth pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';

// Buyer pages
import BuyerDashboard from './pages/Buyer/BuyerDashboard';
import FavoritesPage from './pages/Favorites/FavoritesPage';

// Seller pages
import SellerDashboard from './pages/Seller/SellerDashboard';
import BusinessFormPage from './pages/BusinessForm/BusinessFormPage';
import MyListingsPage from './pages/MyListings/MyListingsPage';

// Shared authenticated pages
import InterestRequests from './pages/Requests/InterestRequests';
import NDAList from './pages/NDA/NDAList';
import NDADetail from './pages/NDA/NDADetail';
import DealsPage from './pages/Deals/DealsPage';
import MeetingsPage from './pages/Meetings/MeetingsPage';
import ProfilePage from './pages/Profile/ProfilePage';
import SettingsPage from './pages/Settings/SettingsPage';

// Admin pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminListings from './pages/Admin/AdminListings';
import AdminPending from './pages/Admin/AdminPending';
import AdminRequests from './pages/Admin/AdminRequests';
import AdminCategories from './pages/Admin/AdminCategories';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Standalone Auth Routes ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ── Application Layout Routes ── */}
            <Route element={<Layout />}>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/businesses" element={<ListingsPage />} />
              <Route path="/business/:id" element={<BusinessDetailPage />} />
              <Route path="/business/:id/request" element={<BuyRequestForm />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/select-role" element={<RoleSelectPage />} />

              {/* Buyer */}
              <Route path="/buyer" element={<RequireRole role="buyer"><BuyerDashboard /></RequireRole>} />
              <Route path="/favorites" element={<RequireRole role="buyer"><FavoritesPage /></RequireRole>} />

              {/* Seller */}
              <Route path="/seller" element={<RequireRole role="seller"><SellerDashboard /></RequireRole>} />
              <Route path="/add-business" element={<RequireRole role="seller"><BusinessFormPage /></RequireRole>} />
              <Route path="/business/:id/edit" element={<RequireRole role="seller"><BusinessFormPage /></RequireRole>} />
              <Route path="/my-listings" element={<RequireRole role="seller"><MyListingsPage /></RequireRole>} />

              {/* Shared (Buyer, Seller, Admin) */}
              <Route path="/requests" element={<RequireRole><InterestRequests /></RequireRole>} />
              <Route path="/nda" element={<RequireRole><NDAList /></RequireRole>} />
              <Route path="/nda/:id" element={<RequireRole><NDADetail /></RequireRole>} />
              <Route path="/deals" element={<RequireRole><DealsPage /></RequireRole>} />
              <Route path="/meetings" element={<RequireRole><MeetingsPage /></RequireRole>} />
              <Route path="/profile" element={<RequireRole><ProfilePage /></RequireRole>} />
              <Route path="/settings" element={<RequireRole><SettingsPage /></RequireRole>} />

              {/* Admin */}
              <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
              <Route path="/admin/users" element={<RequireRole role="admin"><AdminUsers /></RequireRole>} />
              <Route path="/admin/listings" element={<RequireRole role="admin"><AdminListings /></RequireRole>} />
              <Route path="/admin/pending" element={<RequireRole role="admin"><AdminPending /></RequireRole>} />
              <Route path="/admin/requests" element={<RequireRole role="admin"><AdminRequests /></RequireRole>} />
              <Route path="/admin/categories" element={<RequireRole role="admin"><AdminCategories /></RequireRole>} />

              {/* Aliases */}
              <Route path="/listings" element={<Navigate to="/businesses" replace />} />
              <Route path="/sell" element={<Navigate to="/add-business" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
