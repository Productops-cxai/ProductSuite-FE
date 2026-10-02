import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { forgotPassword } from "../api/auth";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { pathForNextStep, resolvePostAuthDestination } from "../lib/productRouting";
import { ui } from "../lib/ui";

export function LoginPage() {
  const { login, user, loading, nextStep, products } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signIn" | "forgot">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!loading && user && nextStep) {
    return <Navigate to={pathForNextStep(nextStep, products)} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      const data = await login(email.trim(), password);
      void keepSignedIn;
      const dest = await resolvePostAuthDestination(data.next_step, data.products);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSendReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      setSent(true);
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  function goForgot() {
    setMode("forgot");
    setSent(false);
    setError("");
    setInfo("");
  }

  function goSignIn() {
    setMode("signIn");
    setSent(false);
    setError("");
    setInfo("");
  }

  return (
    <AuthShell
      title="One platform. Multiple products. Clear access."
      subtitle="Sign in to manage entitlements or enter the products your organization has granted."
    >
      {mode === "signIn" ? (
        <>
          <h2 className="font-display text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Sign in
          </h2>
          <p className="mt-1.5 mb-6 text-[13px] text-slate-500 dark:text-slate-400">
            Continue to your Platform Suite workspace.
          </p>

          {error ? <div className={ui.error}>{error}</div> : null}
          {info ? <div className={ui.success}>{info}</div> : null}

          <form onSubmit={onSubmit}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="email">
                Work Email
              </label>
              <input
                className={ui.control}
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <PasswordInput
              id="password"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="mb-4 flex items-center justify-between gap-3 text-[12px]">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                />
                Keep me signed in
              </label>
              <button type="button" className={ui.link} onClick={goForgot}>
                Forgot password?
              </button>
            </div>
            <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </>
      ) : (
        <>
          <h2 className="font-display text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Reset password
          </h2>
          <p className="mt-1.5 mb-6 text-[13px] text-slate-500 dark:text-slate-400">
            Enter your work email and we&apos;ll send reset instructions.
          </p>

          {error ? <div className={ui.error}>{error}</div> : null}
          {sent || info ? (
            <div className={ui.success}>
              {info ||
                "If this email is registered, reset instructions are on the way."}
            </div>
          ) : null}

          <form onSubmit={onSendReset}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="forgot-email">
                Work Email
              </label>
              <input
                className={ui.control}
                id="forgot-email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
                {submitting ? "Sending…" : "Send Reset Link"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                style={{ width: "100%" }}
                onClick={goSignIn}
              >
                Back To Sign In
              </Button>
            </div>
          </form>
        </>
      )}
    </AuthShell>
  );
}
