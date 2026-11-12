import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Bell, LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { notificationService } from "@/services/ndaService";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();

  const role =
    user?.role?.toUpperCase() === "ADMIN" || user?.is_staff || user?.is_superuser || user?.app_role === "admin"
      ? "admin"
      : user?.app_role || user?.role?.toLowerCase();

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 50);
      setHidden(currentY > lastScrollY && currentY > 200);
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    setMenuOpen(false);
    setBellOpen(false);
    setProfileOpen(false);
  }, [location]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    const fetchNotifs = async () => {
      try {
        const res = await notificationService.getAll();
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        if (mounted) setNotifications(items);
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length) {
      await notificationService.markRead(unread.map((n) => n.id));
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    }
  };

  const baseLinks = [
    { label: "Explore Businesses", path: "/businesses" },
    { label: "How It Works", path: "/how-it-works" },
    { label: "About", path: "/about" },
  ];

  const roleLinks =
    role === "buyer"
      ? [
          { label: "Favorites", path: "/favorites" },
          { label: "My Requests", path: "/requests" },
          { label: "NDAs", path: "/nda" },
          { label: "Meetings", path: "/meetings" },
          { label: "Deals", path: "/deals" },
        ]
      : role === "seller"
        ? [
            { label: "My Listings", path: "/my-listings" },
            { label: "Requests", path: "/requests" },
            { label: "NDAs", path: "/nda" },
            { label: "Meetings", path: "/meetings" },
            { label: "Deals", path: "/deals" },
          ]
        : role === "admin"
          ? [
              { label: "Users", path: "/admin/users" },
              { label: "Listings", path: "/admin/listings" },
              { label: "Pending", path: "/admin/pending" },
              { label: "Categories", path: "/admin/categories" },
            ]
          : [];

  const navLinks = role ? [...baseLinks.slice(0, 1), ...roleLinks] : baseLinks;

  const cta =
    role === "buyer"
      ? { label: "My Dashboard", path: "/buyer" }
      : role === "seller"
        ? { label: "My Dashboard", path: "/seller" }
        : role === "admin"
          ? { label: "Admin", path: "/admin" }
          : null;

  const isHomepage = location.pathname === "/";
  const textColor = isHomepage && !menuOpen ? "text-white" : "text-foreground";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          hidden ? "-translate-y-full" : "translate-y-0"
        } ${
          scrolled
            ? isHomepage && !menuOpen
              ? "bg-foreground/60 backdrop-blur-xl"
              : "bg-background/95 backdrop-blur-xl border-b border-border/50"
            : "bg-transparent"
        }`}
      >
        <div className="w-full px-[4%] md:px-[2%]">
          <div className="flex items-center justify-between h-14 md:h-16">
            <Link to="/" className="relative z-10">
              <span className={`font-display text-2xl md:text-3xl font-light tracking-editorial ${textColor}`}>
                VYAPAR
              </span>
              <span
                className={`font-display text-2xl md:text-3xl font-light tracking-editorial ${
                  isHomepage && !menuOpen ? "text-[#facca3]" : "text-accent"
                }`}
              >
                {" "}
                SANGAM
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-body text-xs tracking-label uppercase relative group pb-1 ${
                    location.pathname === link.path
                      ? "text-accent"
                      : isHomepage && !menuOpen
                        ? "text-white"
                        : "text-foreground"
                  }`}
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-full h-px bg-current origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                </Link>
              ))}

              {cta ? (
                <Link
                  to={cta.path}
                  className={`text-xs px-6 py-2.5 font-body tracking-widest uppercase transition-all duration-500 rounded-full border ${
                    isHomepage && !menuOpen
                      ? "border-white bg-white text-black hover:bg-white/80"
                      : "border-foreground bg-foreground text-background hover:bg-foreground/80"
                  }`}
                >
                  {cta.label}
                </Link>
              ) : isAuthenticated ? (
                <Link
                  to="/select-role"
                  className="text-xs px-6 py-2.5 font-body tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-all duration-500"
                >
                  Choose Role
                </Link>
              ) : (
                <Link
                  to="/login"
                  className={`text-xs px-6 py-2.5 font-body tracking-widest uppercase transition-all duration-500 rounded-full border ${
                    isHomepage && !menuOpen
                      ? "border-white bg-white text-black hover:bg-white/80"
                      : "border-foreground bg-foreground text-background hover:bg-foreground/80"
                  }`}
                >
                  Login / Register
                </Link>
              )}

              {/* Notification Bell */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => { setBellOpen(!bellOpen); setProfileOpen(false); }}
                    aria-label="Notifications"
                    className={`relative p-2 ${isHomepage && !menuOpen ? "text-white" : "text-foreground"}`}
                  >
                    <Bell size={17} strokeWidth={1.5} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] flex items-center justify-center font-body">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {bellOpen && (
                    <div className="absolute right-0 top-10 w-80 bg-background border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <span className="font-body text-xs tracking-label uppercase text-muted-foreground">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="font-body text-xs text-accent hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center font-body text-xs text-muted-foreground">
                          You have no notifications.
                        </p>
                      ) : (
                        <div className="max-h-72 overflow-y-auto">
                          {notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => { setBellOpen(false); if (n.link) navigate(n.link); }}
                              className={`block w-full text-left px-4 py-3 border-b border-border/60 last:border-0 hover:bg-secondary/60 transition-colors ${
                                n.read ? "opacity-60" : ""
                              }`}
                            >
                              <p className="font-body text-sm text-foreground">{n.title}</p>
                              <p className="font-body text-xs text-muted-foreground mt-0.5">{n.message}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Profile Dropdown */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => { setProfileOpen(!profileOpen); setBellOpen(false); }}
                    aria-label="Account menu"
                    className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                      isHomepage && !menuOpen ? "border-white/40 text-white" : "border-border text-foreground"
                    }`}
                  >
                    <UserIcon size={15} strokeWidth={1.5} />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-11 w-48 bg-background border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="font-body text-sm text-foreground truncate">{user?.full_name || user?.email}</p>
                        <p className="font-body text-[10px] tracking-label uppercase text-accent mt-0.5">
                          {role || "Role not selected"}
                        </p>
                      </div>
                      <Link to="/profile" className="block px-4 py-2.5 font-body text-sm text-foreground hover:bg-secondary/60 transition-colors">Profile</Link>
                      <Link to="/settings" className="block px-4 py-2.5 font-body text-sm text-foreground hover:bg-secondary/60 transition-colors">Settings</Link>
                      <button
                        onClick={() => logout(false)}
                        className="w-full text-left px-4 py-2.5 font-body text-sm text-foreground hover:bg-secondary/60 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={13} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden relative z-10 p-2 ${menuOpen ? "text-foreground" : textColor}`}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-background flex flex-col items-start justify-center px-[6%] md:hidden animate-fade-in">
          <nav className="flex flex-col items-start gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="font-display text-display-md text-foreground hover:text-accent transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div>
              {cta ? (
                <Link to={cta.path} className="ghost-btn text-sm mt-4">My Dashboard</Link>
              ) : isAuthenticated ? (
                <Link to="/select-role" className="ghost-btn text-sm mt-4">Choose Role</Link>
              ) : (
                <Link to="/login" className="ghost-btn text-sm mt-4">Login / Register</Link>
              )}
            </div>
            {isAuthenticated && (
              <div className="mt-8 flex flex-col items-start gap-3 font-body text-xs tracking-label uppercase text-muted-foreground">
                <Link to="/profile" className="hover:text-foreground">Profile</Link>
                <Link to="/settings" className="hover:text-foreground">Settings</Link>
                <button onClick={() => logout(false)} className="hover:text-foreground flex items-center gap-1.5">
                  <LogOut size={12} /> Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
