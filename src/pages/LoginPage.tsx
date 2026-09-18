import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { forgotPassword } from "../api/auth";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import type { LoginNextStep } from "../types";

function routeForNextStep(step: LoginNextStep): string {
  switch (step) {
    case "platform_admin":
      return "/platform";
    case "product_selection":
    case "direct_entry":
      return "/products";
    default:
      return "/no-access";
  }
}

export function LoginPage() {
  const { login, user, loading, nextStep } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && nextStep) {
    return <Navigate to={routeForNextStep(nextStep)} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      const step = await login(email.trim(), password);
      void keepSignedIn;
      navigate(routeForNextStep(step), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  async function onForgot() {
    setError("");
    setInfo("");
    try {
      const res = await forgotPassword(email.trim());
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Request failed");
    }
  }

  return (
    <AuthShell
      title="One platform. Multiple products. Clear access."
      subtitle="Sign in to manage entitlements or enter the products your organization has granted."
    >
      <h2>Sign in</h2>
      <p className="subtitle">Continue to your Platform Suite workspace.</p>

      {error ? <div className="error-banner">{error}</div> : null}
      {info ? <div className="success-banner">{info}</div> : null}

      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="email">Work Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label>
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
            />
            Keep me signed in
          </label>
          <button type="button" className="link-btn" onClick={() => void onForgot()}>
            Forgot password?
          </button>
        </div>
        <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </AuthShell>
  );
}
