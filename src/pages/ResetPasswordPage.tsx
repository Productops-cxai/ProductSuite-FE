import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { ui } from "../lib/ui";

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
      <h2 className="font-display mb-1 text-[1.6rem] font-bold tracking-tight">Reset password</h2>
      <p className="mb-5 text-[0.95rem] text-slate-500">Enter a new password to continue signing in.</p>

      {error ? <div className={ui.error}>{error}</div> : null}
      {info ? <div className={ui.success}>{info}</div> : null}

      <form onSubmit={onSubmit}>
        <PasswordInput
          id="reset-pass"
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <PasswordInput
          id="reset-confirm"
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />
        <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Saving…" : "Update password"}
        </Button>
      </form>

      <p className="mt-4 text-sm">
        <Link className={ui.link} to="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
