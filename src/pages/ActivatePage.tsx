import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { activateAccount, previewActivation } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { ui } from "../lib/ui";

export function ActivatePage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Activation link is missing a token.");
      setLoading(false);
      return;
    }
    void previewActivation(token)
      .then((res) => {
        setEmail(res.email);
        setFullName(res.full_name);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.detail : "This activation link is invalid or expired.",
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (password !== confirm) {
      setError("New password and confirm password do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await activateAccount(token, password, confirm);
      setInfo(res.message);
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to activate account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Activate your account and set a password."
      subtitle="You were invited to Platform Suite. Finish setup once, then sign in to your entitled products."
      eyebrow="Account activation"
    >
      <h2 className="font-display mb-1 text-[1.6rem] font-bold tracking-tight">Set password</h2>
      <p className="mb-5 text-[0.95rem] text-slate-500">
        {fullName ? `Welcome, ${fullName}. ` : null}
        Choose a password for your work email.
      </p>

      {loading ? <div className={ui.empty}>Validating invite…</div> : null}
      {error ? <div className={ui.error}>{error}</div> : null}
      {info ? <div className={ui.success}>{info}</div> : null}

      {!loading && email ? (
        <form onSubmit={onSubmit}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="act-email">Work Email</label>
            <input id="act-email" className={`${ui.control} bg-slate-50 text-slate-500`} type="email" value={email} readOnly />
          </div>
          <PasswordInput
            id="act-pass"
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <PasswordInput
            id="act-confirm"
            label="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Saving…" : "Activate account"}
          </Button>
        </form>
      ) : null}

      <p className="mt-4 text-sm text-slate-500">
        Already activated? <Link className={ui.link} to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
