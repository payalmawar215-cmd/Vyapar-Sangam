import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/common/AuthLayout";
import { authService } from "@/services/authService";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const fe = {};
    if (password.length < 8) fe.password = "Use at least 8 characters.";
    if (confirm !== password) fe.confirm = "Passwords do not match.";
    setFieldErrors(fe);
    if (Object.keys(fe).length) return;

    setBusy(true);
    try {
      await authService.resetPassword({ token, new_password: password });
      navigate("/login", { state: { registeredMessage: "Password updated successfully! Please sign in." } });
    } catch (err) {
      setError(err?.response?.data?.error || "This reset link is invalid or has expired. Please request a new one.");
      setBusy(false);
    }
  };

  const inputCls = "w-full border border-border bg-background px-4 py-3 rounded-full text-sm focus:outline-none focus:border-accent transition-colors";

  return (
    <AuthLayout
      icon={KeyRound}
      title="Set a new password"
      subtitle="Choose a strong password for your account"
      footer={token ? <Link to="/login" className="text-accent hover:underline font-medium">Back to sign in</Link> : <span className="text-destructive">Missing reset token. Request a new link.</span>}
    >
      {!token ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">This reset link is incomplete or missing a token.</p>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm text-accent hover:underline font-medium">
            Request a new reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="reset-password" className="block text-xs font-medium uppercase tracking-label text-muted-foreground mb-2">
              New password
            </label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-xs text-destructive mt-1.5">{fieldErrors.password}</p>}
          </div>

          <div>
            <label htmlFor="reset-confirm" className="block text-xs font-medium uppercase tracking-label text-muted-foreground mb-2">
              Confirm new password
            </label>
            <input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className={inputCls}
            />
            {fieldErrors.confirm && <p className="text-xs text-destructive mt-1.5">{fieldErrors.confirm}</p>}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-full border border-foreground bg-foreground text-background text-xs font-medium tracking-widest uppercase hover:bg-foreground/80 transition-all duration-300 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {busy ? "Updating…" : "Update Password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
