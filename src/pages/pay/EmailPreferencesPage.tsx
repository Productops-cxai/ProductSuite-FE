import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  resubscribeEmailPreference,
  resolveEmailPreference,
  unsubscribeEmailPreference,
  type PayflowEmailPreferencePublic,
} from "../../api/publicEmailPreferences";
import {
  EMAIL_UNSUBSCRIBE_REASON_OPTIONS,
  formatUnsubscribeStamp,
} from "../../lib/emailUnsubscribe";

function MailOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-7 text-blue-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 7 9-7" />
      <path d="M15.2 3.8 19.2 7.8" strokeLinecap="round" />
      <path d="M19.2 3.8 15.2 7.8" strokeLinecap="round" />
    </svg>
  );
}

function PreferenceCard({ brand, children }: { brand?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef3f8] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)]">
        <div className="bg-primary px-5 py-3.5 text-primary-foreground">
          <p className="text-[15px] font-semibold tracking-tight">{brand || "Email preferences"}</p>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function EmailPreferencesPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [pref, setPref] = useState<PayflowEmailPreferencePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!token) {
      setError("This preference link is invalid.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setMessage("");
    setSelected("");
    setComment("");
    resolveEmailPreference(token)
      .then((res) => {
        if (!cancelled) setPref(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Unable to load preferences");
          setPref(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleUnsubscribe() {
    if (!token || busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    const collectReasons = Boolean(pref?.collect_reasons || pref?.unsubscribe_option_enabled);
    const allowed = new Set(
      (pref?.reason_options?.length ? pref.reason_options : EMAIL_UNSUBSCRIBE_REASON_OPTIONS).map(
        (option) => option.code,
      ),
    );
    const reasons = collectReasons && selected && allowed.has(selected) ? [selected] : [];
    const trimmed = comment.trim();
    try {
      const res = await unsubscribeEmailPreference(token, {
        source: "preference_page",
        ...(reasons.length ? { reasons } : {}),
        ...(trimmed && collectReasons ? { comment: trimmed } : {}),
      });
      setPref(res);
      setSelected("");
      setComment("");
      setMessage("You have been unsubscribed from collection emails.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unsubscribe failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleResubscribe() {
    if (!token || busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await resubscribeEmailPreference(token);
      setPref(res);
      setSelected("");
      setComment("");
      setMessage("You are subscribed to collection emails again.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Resubscribe failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PreferenceCard>
        <p className="text-sm text-slate-500">Loading preferences…</p>
      </PreferenceCard>
    );
  }

  if (error && !pref) {
    return (
      <PreferenceCard>
        <h1 className="text-[20px] font-semibold text-slate-900">Link unavailable</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{error}</p>
      </PreferenceCard>
    );
  }

  const brand = pref?.brand_name || "this client";
  const subscribed = Boolean(pref?.subscribed);
  const ruleApplies = Boolean(pref?.collect_reasons || pref?.unsubscribe_option_enabled);
  const reasonOptions = ruleApplies
    ? pref?.reason_options?.length
      ? pref.reason_options
      : EMAIL_UNSUBSCRIBE_REASON_OPTIONS
    : [];
  const showChecklist = subscribed && reasonOptions.length > 0;
  const last = !subscribed ? pref?.last_unsubscribe : null;

  return (
    <PreferenceCard brand={pref?.brand_name}>
      <MailOffIcon />
      <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-slate-900">
        {subscribed ? "Unsubscribe from Emails" : "You are unsubscribed"}
      </h1>
      <p className="mt-2 text-[14px] text-slate-700">{pref?.brand_name || brand}</p>
      {pref?.email_masked ? (
        <p className="text-[14px] text-slate-500">{pref.email_masked}</p>
      ) : null}
      <p className="mt-3 text-[14px] leading-relaxed text-slate-700">
        {subscribed
          ? `You can unsubscribe from email reminders from ${brand}.`
          : `You will not receive further collection emails from ${brand}.`}
      </p>

      {last ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700">
          <p className="font-medium text-slate-900">
            Unsubscribed {formatUnsubscribeStamp(last.unsubscribed_at)}
          </p>
          <p className="mt-1 leading-relaxed">
            {last.reason_labels?.length ? last.reason_labels.join("; ") : "No reason was provided."}
          </p>
          {last.comment?.trim() ? (
            <p className="mt-1 leading-relaxed text-slate-600">{last.comment.trim()}</p>
          ) : null}
        </div>
      ) : null}

      {showChecklist ? (
        <fieldset disabled={busy} className="mt-5">
          <legend className="text-[14px] font-semibold text-slate-900">
            Why would you like to unsubscribe?{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </legend>
          <div className="mt-2.5 space-y-2">
            {reasonOptions.map((option) => (
              <label
                key={option.code}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/50"
              >
                <input
                  type="radio"
                  name="unsubscribe-reason"
                  className="size-4 shrink-0 accent-blue-600"
                  checked={selected === option.code}
                  onClick={(event) => {
                    if (selected === option.code) {
                      event.preventDefault();
                      setSelected("");
                    }
                  }}
                  onChange={() => setSelected(option.code)}
                />
                <span className="text-[14px] leading-snug text-slate-800">{option.label}</span>
              </label>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[14px] font-semibold text-slate-900">
              Comments <span className="font-normal text-slate-500">(optional)</span>
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              disabled={busy}
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-[14px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
          </label>
        </fieldset>
      ) : null}

      {message ? <p className="mt-3 text-[13px] font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p> : null}

      {subscribed ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleUnsubscribe()}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Working…" : "Confirm Unsubscribe"}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleResubscribe()}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Working…" : "Subscribe again"}
        </button>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
        This stops collection emails. It does not close your account or cancel a payment plan.
      </p>
    </PreferenceCard>
  );
}
