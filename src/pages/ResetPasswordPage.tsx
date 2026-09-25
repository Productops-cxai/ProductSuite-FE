import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { previewPasswordReset, resetPassword } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { ui } from "../lib/ui";

const PASSWORD_MIN_LENGTH = 8;

const INVALID_LINK_MESSAGE =
  "This setup link is invalid, expired, or has already been used. Password reset cannot continue.";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (completed) return;

    if (!token) {
      setError("Reset link is missing a token.");
      setLinkInvalid(true);
      setLoading(false);
      return;
    }
    void previewPasswordReset(token)
      .then((res) => {
        setEmail(res.email);
        setLinkInvalid(false);
      })
      .catch((err) => {
        setLinkInvalid(true);
        setEmail("");
        setError(err instanceof ApiError ? err.detail : INVALID_LINK_MESSAGE);
      })
      .finally(() => setLoading(false));
  }, [token, completed]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (completed || linkInvalid || !token || !email || submitting) return;

    setError("");
    if (password !== confirm) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await resetPassword(token, password, confirm);
      setInfo(res.message);
      setCompleted(true);
      setLinkInvalid(false);
      setEmail("");
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Unable to reset password";
      setError(detail);
      if (err instanceof ApiError && /invalid|expired|already used/i.test(err.detail)) {
        setLinkInvalid(true);
        setEmail("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showForm = !loading && !completed && !linkInvalid && Boolean(email);

  return (
    <AuthShell
      title="Choose a new password."
      subtitle="Use your reset link once to secure your Platform Suite account, then continue to sign in."
      eyebrow="Password reset"
      brandTagline="Secure account setup"
      highlights={[
        "Reset links work one time only",
        "After you set a password the link cannot be opened again",
        "Request a new reset email if you need another link",
      ]}
    >
      {loading && !completed ? (
        <>
          <h2 className="font-display mb-1 text-[1.6rem] font-bold tracking-tight">Reset password</h2>
          <div className={ui.empty}>Validating reset link…</div>
        </>
      ) : null}

      {completed ? (
        <>
          <h2 className="font-display mb-1 text-[1.6rem] font-bold tracking-tight">
            Password updated
          </h2>
          <p className="mb-5 text-[0.95rem] text-slate-500">
            Your new password is set. This reset link cannot be used again.
          </p>
          {info ? <div className={`${ui.success} mb-4`}>{info}</div> : null}
          <div className="mt-5 flex flex-col gap-3">
            <Button type="button" style={{ width: "100%" }} onClick={() => navigate("/login")}>
              Back to sign in
            </Button>
          </div>
        </>
      ) : null}

      {!loading && !completed && linkInvalid ? (
        <>
          <h2 className="font-display mb-1 text-[1.6rem] font-bold tracking-tight">
            Link expired or invalid
          </h2>
          <p className="mb-5 text-[0.95rem] text-slate-500">
            This password reset link cannot be used. It may be expired or already used.
          </p>
          <div className={ui.error}>{error || INVALID_LINK_MESSAGE}</div>
          <div className="mt-5 flex flex-col gap-3">
            <Button type="button" style={{ width: "100%" }} onClick={() => navigate("/login")}>
              Back to sign in
            </Button>
            <p className="text-sm leading-relaxed text-slate-500">
              Need a new link? Use <strong>Forgot password</strong> on the sign-in page.
            </p>
          </div>
        </>
      ) : null}

      {showForm ? (
        <>
          <h2 className="font-display mb-1 text-[1.6rem] font-bold tracking-tight">Reset password</h2>
          <p className="mb-5 text-[0.95rem] text-slate-500">
            Enter a new password for your account. This link can only be used once.
          </p>

          {error ? <div className={ui.error}>{error}</div> : null}

          <form onSubmit={onSubmit}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="reset-email">
                Registered Email
              </label>
              <input
                id="reset-email"
                className={`${ui.control} bg-slate-50 text-slate-500`}
                type="email"
                value={email}
                readOnly
                autoComplete="username"
              />
            </div>
            <PasswordInput
              id="reset-pass"
              label="New Password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            <PasswordInput
              id="reset-confirm"
              label="Confirm Password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            <p className="mb-4 text-[0.82rem] text-slate-500">
              Password must be at least {PASSWORD_MIN_LENGTH} characters.
            </p>
            <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "Saving…" : "Update password"}
            </Button>
          </form>

          <p className="mt-4 text-sm">
            <Link className={ui.link} to="/login">
              Back to sign in
            </Link>
          </p>
        </>
      ) : null}
    </AuthShell>
  );
}
