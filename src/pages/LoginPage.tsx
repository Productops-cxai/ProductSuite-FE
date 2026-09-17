import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { forgotPassword } from "../api/auth";
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
  const [email, setEmail] = useState("admin@payflow.ai");
  const [password, setPassword] = useState("Admin@12345");
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
      if (!keepSignedIn) {
        /* tokens still in localStorage for session continuity in this phase */
      }
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
    <div className="login-page">
      <section className="login-visual">
        <div className="brand-mark" style={{ marginBottom: 20 }}>
          P
        </div>
        <h1>Collections operations, orchestrated end to end.</h1>
        <p>
          Client portfolios, customer accounts, collection cases, adaptive workflows and governed
          AI decisions — in one operational workspace.
        </p>
        <ul>
          <li>Adaptive collection workflows with human review</li>
          <li>Governance rules applied before every action</li>
          <li>Customer payment experience and outcomes</li>
        </ul>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="brand">
            <div className="brand-mark">P</div>
            <div className="brand-text">
              <strong>PayFlow</strong>
              <span>Platform Suite</span>
            </div>
          </div>
          <h2>Sign in</h2>
          <p className="subtitle">Continue to your collections operations workspace.</p>

          {error ? <div className="error-banner">{error}</div> : null}
          {info ? <div className="success-banner">{info}</div> : null}

          <form onSubmit={onSubmit}>
            <div className="form-field">
              <label htmlFor="email">Work Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
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
        </div>
      </section>
    </div>
  );
}
