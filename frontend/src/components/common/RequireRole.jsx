import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Fallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

// Guards a route for a specific marketplace role. Logged-out visitors are sent to
// login; logged-in users without a role are sent to role selection; wrong roles
// see a clear notice (admins always pass).
export default function RequireRole({ role, children }) {
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      const fullPath = location.pathname + location.search;
      if (navigateToLogin) {
        navigateToLogin(fullPath);
      } else {
        navigate(`/login?return_to=${encodeURIComponent(fullPath)}`, { replace: true });
      }
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin, navigate, location]);

  if (isLoadingAuth || !isAuthenticated) return <Fallback />;

  const userRoleStr = user?.role ? String(user.role).trim() : '';
  const appRole = user?.app_role ? String(user.app_role).toLowerCase() : userRoleStr.toLowerCase();

  const isPlatformAdmin =
    appRole === "admin" ||
    userRoleStr.toUpperCase() === "ADMIN" ||
    Boolean(user?.is_staff) ||
    Boolean(user?.is_superuser);

  const targetRoleStr = role ? String(role).toLowerCase() : '';
  const allowed = !role || appRole === targetRoleStr || isPlatformAdmin;

  if (!appRole && !isPlatformAdmin) {
    navigate("/select-role", { replace: true });
    return <Fallback />;
  }

  if (!allowed) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">Restricted</p>
        <h1 className="font-display text-display-lg font-light text-foreground">This area is for {role}s</h1>
        <p className="font-body text-sm text-muted-foreground mt-4 max-w-md">
          Your account is registered as a {appRole || 'user'}. Switch from your profile settings if this is a mistake.
        </p>
      </div>
    );
  }

  return children;
}
