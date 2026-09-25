import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { activateAccount, previewActivation } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { ui } from "../lib/ui";

const PASSWORD_MIN_LENGTH = 8;

const INVALID_LINK_MESSAGE =
  "This setup link is invalid, expired, or has already been used. Password setup cannot continue.";

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
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (completed) return;

    if (!token) {
      setError("Activation link is missing a token.");
      setLinkInvalid(true);
      setLoading(false);
      return;
    }
    void previewActivation(token)
      .then((res) => {
        setEmail(res.email);
        setFullName(res.full_name);
        setLinkInvalid(false);
      })
      .catch((err) => {
        setLinkInvalid(true);
        setEmail("");
        setFullName("");
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
      const res = await activateAccount(token, password, confirm);
      setInfo(res.message);
      setCompleted(true);
      setLinkInvalid(false);
      setEmail("");
      setFullName("");
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Unable to activate account";
      setError(detail);
      if (
        err instanceof ApiError &&
        /invalid|expired|already used/i.test(err.detail)
      ) {
        setLinkInvalid(true);
        setEmail("");
        setFullName("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showForm = !loading && !completed && !linkInvalid && Boolean(email);

  return (
    <AuthShell
      title="Activate your account and set a password."
      subtitle="Finish password setup once. Product access is assigned by your administrator and is not configured on this screen."
      eyebrow="Account activation"
      brandTagline="Secure account setup"
      highlights={[
        "Create your own password — administrators never set or see it",
        "The same credentials work across products you are entitled to",
        "Product access, roles and scope are managed separately after you sign in",
      ]}
    >
      {loading && !completed ? (
        <>
          <h2 className="font-display mb-1 text-[1.6rem] font-bold tracking-tight">Set password</h2>
          <div className={ui.empty}>Validating invite…</div>
        </>
      ) : null}

      {completed ? (
        <>
          <h2 className="font-display mb-1 text-[1.6rem] font-bold tracking-tight">
            Account activated
          </h2>
          <p className="mb-5 text-[0.95rem] text-slate-500">
            Your password is set. This invitation link cannot be used again.
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
            Password setup cannot proceed with this invitation link.
          </p>
          <div className={ui.error}>{error || INVALID_LINK_MESSAGE}</div>
          <div className="mt-5 flex flex-col gap-3">
            <Button type="button" style={{ width: "100%" }} onClick={() => navigate("/login")}>
              Back to sign in
            </Button>
            <p className="text-sm leading-relaxed text-slate-500">
              Need a new invitation? Contact your platform administrator to resend the account
              setup email.
            </p>
          </div>
        </>
      ) : null}

      {showForm ? (
        <>
          <h2 className="font-display mb-1 text-[1.6rem] font-bold tracking-tight">Set password</h2>
          <p className="mb-5 text-[0.95rem] text-slate-500">
            {fullName ? `Welcome, ${fullName}. ` : null}
            Choose a password for your registered work email. You cannot change product access,
            roles or permissions here.
          </p>

          {error ? <div className={ui.error}>{error}</div> : null}

          <form onSubmit={onSubmit}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="act-email">
                Registered Email
              </label>
              <input
                id="act-email"
                className={`${ui.control} bg-slate-50 text-slate-500`}
                type="email"
                value={email}
                readOnly
                autoComplete="username"
              />
            </div>
            <PasswordInput
              id="act-pass"
              label="New Password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            <PasswordInput
              id="act-confirm"
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
              {submitting ? "Saving…" : "Set Password & Continue"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-slate-500">
            Already activated?{" "}
            <Link className={ui.link} to="/login">
              Sign in
            </Link>
          </p>
        </>
      ) : null}
    </AuthShell>
  );
}
