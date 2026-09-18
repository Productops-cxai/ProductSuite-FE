import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!token) {
      setError("Reset link is missing a token.");
      return;
    }
    if (password !== confirm) {
      setError("New password and confirm password do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await resetPassword(token, password, confirm);
      setInfo(res.message);
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Choose a new password."
      subtitle="Use your reset link to secure your Platform Suite account, then continue to sign in."
      eyebrow="Password reset"
    >
      <h2>Reset password</h2>
      <p className="subtitle">Enter a new password to continue signing in.</p>

      {error ? <div className="error-banner">{error}</div> : null}
      {info ? <div className="success-banner">{info}</div> : null}

      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="reset-pass">New password</label>
          <input
            id="reset-pass"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="reset-confirm">Confirm password</label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Saving…" : "Update password"}
        </Button>
      </form>

      <p className="auth-footer-link">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
