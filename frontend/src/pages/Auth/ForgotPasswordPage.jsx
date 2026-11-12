import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, MailCheck } from "lucide-react";
import AuthLayout from "@/components/common/AuthLayout";
import { authService } from "@/services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      setSent(true);
      if (res?.dev_token) {
        setDevToken(res.dev_token);
      }
    } catch {
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      icon={KeyRound}
      title="Reset your password"
      subtitle="We'll email you a secure reset link"
      footer={<Link to="/login" className="text-accent hover:underline font-medium">Back to sign in</Link>}
    >
      {sent ? (
        <div className="text-center py-6">
          <MailCheck size={32} className="text-accent mx-auto mb-4" />
          <p className="font-body text-sm text-foreground">
            If an account exists for that email, a password reset link is on its way.
          </p>
          <p className="font-body text-xs text-muted-foreground mt-2">
            Check your inbox and follow the link to set a new password.
          </p>
          {devToken && (
            <div className="mt-6 p-4 rounded-xl border border-accent/30 bg-accent/5 text-left text-xs">
              <p className="font-medium text-accent uppercase tracking-wider text-[10px] mb-1">Developer Mode Token</p>
              <p className="font-mono break-all text-muted-foreground">{devToken}</p>
              <Link
                to={`/reset-password?token=${devToken}`}
                className="mt-3 inline-block font-medium text-accent hover:underline text-xs"
              >
                Proceed to Reset Form →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-medium uppercase tracking-label text-muted-foreground mb-2">
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-border bg-background px-4 py-3 rounded-full text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-full border border-foreground bg-foreground text-background text-xs font-medium tracking-widest uppercase hover:bg-foreground/80 transition-all duration-300 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {busy ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
