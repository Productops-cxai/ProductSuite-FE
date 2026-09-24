import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { changePassword, updateProfile } from "../../api/auth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { applyTheme, readThemeMode, watchSystemTheme, type ThemeMode } from "../../lib/theme";
import { ui } from "../../lib/ui";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function roleLabel(role: string) {
  if (role === "platform_super_admin") return "Platform Super Admin";
  return "Operations Admin";
}

function statusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "invited") return "Invited";
  if (status === "disabled") return "Disabled";
  return status;
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

const THEME_OPTS: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function PayFlowProfilePage() {
  const { user, refreshMe } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");

  const [theme, setTheme] = useState<ThemeMode>(() => readThemeMode());

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user?.full_name]);

  useEffect(() => {
    applyTheme(theme);
    return watchSystemTheme();
  }, [theme]);

  if (!user) return null;

  const label = roleLabel(user.role);
  const statusTone = user.status === "active" ? "success" : "danger";

  function onThemeChange(mode: ThemeMode) {
    setTheme(mode);
    applyTheme(mode);
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMsg("");
    setProfileErr("");
    try {
      await updateProfile(fullName.trim());
      await refreshMe();
      setProfileMsg("Profile saved.");
    } catch (err) {
      setProfileErr(err instanceof ApiError ? err.detail : "Unable to save profile");
    } finally {
      setProfileBusy(false);
    }
  }

  async function onUpdatePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordBusy(true);
    setPasswordMsg("");
    setPasswordErr("");
    if (newPassword !== confirmPassword) {
      setPasswordErr("New password and confirm password do not match.");
      setPasswordBusy(false);
      return;
    }
    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      setPasswordMsg(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordErr(err instanceof ApiError ? err.detail : "Unable to update password");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <div>
          <h1 className={ui.h1}>My Profile</h1>
          <p className={ui.lead}>Manage your personal details, appearance and account security.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <form className={`${ui.card} p-6`} onSubmit={(e) => void onSaveProfile(e)}>
            <h2 className={ui.formTitle}>Profile details</h2>
            <p className={ui.formText}>Your identity across the PayFlow workspace.</p>

            {profileErr ? <div className={`${ui.error} mt-4 mb-0`}>{profileErr}</div> : null}
            {profileMsg ? <div className={`${ui.success} mt-4 mb-0`}>{profileMsg}</div> : null}

            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex w-[112px] shrink-0 flex-col items-center gap-2.5">
                <div className="font-display grid size-[88px] place-items-center rounded-full bg-blue-100 text-[1.35rem] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  {initials(fullName || user.full_name)}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-primary hover:text-primary-hover"
                  title="Photo upload is not available yet"
                  onClick={() => setProfileErr("Photo upload is not available yet.")}
                >
                  <CameraIcon />
                  Change photo
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className={ui.grid2}>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="profile-full-name">
                      Full Name
                    </label>
                    <input
                      id="profile-full-name"
                      className={ui.control}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      maxLength={255}
                      autoComplete="name"
                    />
                  </div>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="profile-email">
                      Work Email
                    </label>
                    <input
                      id="profile-email"
                      className={ui.controlMuted}
                      value={user.email}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
                <div className={ui.grid2}>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="profile-role">
                      Role
                    </label>
                    <input id="profile-role" className={ui.controlMuted} value={label} readOnly disabled />
                  </div>
                  <div className={ui.field}>
                    <span className={ui.label}>Account Status</span>
                    <div className={`${ui.controlMuted} flex items-center`}>
                      <Badge tone={statusTone}>{statusLabel(user.status)}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
              <Button type="submit" disabled={profileBusy || !fullName.trim()}>
                {profileBusy ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </form>

          <form className={`${ui.card} p-6`} onSubmit={(e) => void onUpdatePassword(e)}>
            <h2 className={ui.formTitle}>Change password</h2>
            <p className={ui.formText}>Update the password used for your PayFlow account.</p>

            {passwordErr ? <div className={`${ui.error} mt-4 mb-0`}>{passwordErr}</div> : null}
            {passwordMsg ? <div className={`${ui.success} mt-4 mb-0`}>{passwordMsg}</div> : null}

            <div className="mt-5">
              <PasswordInput
                label="Current Password"
                id="current-password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <div className={ui.grid2}>
                <div>
                  <PasswordInput
                    label="New Password"
                    id="new-password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="-mt-2 text-[0.8rem] text-slate-500 dark:text-slate-400">Use at least 8 characters.</p>
                </div>
                <PasswordInput
                  label="Confirm New Password"
                  id="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="mt-2 flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
              <Button type="submit" disabled={passwordBusy}>
                <KeyIcon />
                {passwordBusy ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </form>
        </div>

        <aside className="space-y-5">
          <div className={`${ui.card} p-5`}>
            <h2 className={ui.panelTitle}>Appearance</h2>
            <p className={ui.panelText}>Choose how PayFlow looks for you.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {THEME_OPTS.map((opt) => {
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-[0.82rem] font-semibold transition ${
                      active
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                    onClick={() => onThemeChange(opt.id)}
                    aria-pressed={active}
                  >
                    <span aria-hidden>
                      {opt.id === "light" ? (
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                        </svg>
                      ) : opt.id === "dark" ? (
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="4" width="18" height="14" rx="2" />
                          <path d="M8 21h8M12 18v3" />
                        </svg>
                      )}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${ui.card} p-5`}>
            <h2 className={ui.panelTitle}>Account overview</h2>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <MailIcon />
                <div className="min-w-0">
                  <p className="text-[0.78rem] text-slate-500 dark:text-slate-400">Work email</p>
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldIcon />
                <div className="min-w-0">
                  <p className="text-[0.78rem] text-slate-500 dark:text-slate-400">Access</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {label} · 3 clients in view
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
