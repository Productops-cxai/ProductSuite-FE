import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  resubscribeEmailPreference,
  resolveEmailPreference,
  unsubscribeEmailPreference,
  type PayflowEmailPreferencePublic,
} from "../../api/publicEmailPreferences";
import { formatUnsubscribeStamp, toggleUnsubscribeReason } from "../../lib/emailUnsubscribe";

function Shell({
  brand,
  wide,
  children,
}: {
  brand?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-10">
      <div
        className={`mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${
          wide ? "max-w-lg" : "max-w-md"
        }`}
      >
        <div className="bg-blue-600 px-5 py-4 text-white">
          <p className="text-[15px] font-semibold">{brand || "PayFlow"}</p>
          <p className="mt-0.5 text-[12px] opacity-90">Email preferences</p>
        </div>
        <div className="space-y-4 px-5 py-5">{children}</div>
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
  const [selected, setSelected] = useState<string[]>([]);
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
    setSelected([]);
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
    const collectReasons = Boolean(pref?.collect_reasons);
    const allowed = new Set((pref?.reason_options || []).map((option) => option.code));
    const reasons = collectReasons ? selected.filter((code) => allowed.has(code)) : [];
    const trimmed = comment.trim();
    try {
      const res = await unsubscribeEmailPreference(token, {
        source: "preference_page",
        ...(reasons.length ? { reasons } : {}),
        ...(trimmed && collectReasons ? { comment: trimmed } : {}),
      });
      setPref(res);
      setSelected([]);
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
      setSelected([]);
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
      <Shell>
        <p className="text-sm text-slate-500">Loading preferences…</p>
      </Shell>
    );
  }

  if (error && !pref) {
    return (
      <Shell>
        <h1 className="text-[18px] font-semibold text-slate-900">Link unavailable</h1>
        <p className="text-[14px] leading-relaxed text-slate-600">{error}</p>
      </Shell>
    );
  }

  const subscribed = Boolean(pref?.subscribed);
  const collectReasons = Boolean(pref?.collect_reasons);
  const reasonOptions = pref?.reason_options || [];
  const showChecklist = subscribed && collectReasons && reasonOptions.length > 0;
  const last = !subscribed ? pref?.last_unsubscribe : null;
  const who = [
    pref?.email_masked ? `at ${pref.email_masked}` : "",
    pref?.account_reference ? `for account ${pref.account_reference}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Shell brand={pref?.brand_name} wide={showChecklist}>
      <h1 className="text-[18px] font-semibold text-slate-900">
        {subscribed ? "Manage email updates" : "You are unsubscribed"}
      </h1>
      <p className="text-[14px] leading-relaxed text-slate-600">
        {subscribed
          ? `Stop receiving collection emails${who ? ` ${who}` : ""}. This does not close your account or cancel a payment plan.`
          : `You will not receive further collection emails${who ? ` ${who}` : ""}. You can subscribe again if you change your mind.`}
      </p>

      {last ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700">
          <p className="font-medium text-slate-900">
            Unsubscribed {formatUnsubscribeStamp(last.unsubscribed_at)}
          </p>
          <p className="mt-1 leading-relaxed">
            {last.reason_labels?.length
              ? last.reason_labels.join("; ")
              : "No reason was provided."}
          </p>
          {last.comment?.trim() ? (
            <p className="mt-1 leading-relaxed text-slate-600">{last.comment.trim()}</p>
          ) : null}
        </div>
      ) : null}

      {showChecklist ? (
        <fieldset disabled={busy} className="space-y-2">
          <legend className="text-[13px] font-semibold text-slate-900">
            Why are you unsubscribing? (optional)
          </legend>
          <p className="text-[12px] leading-relaxed text-slate-500">
            Select any that apply. You can confirm without choosing a reason. A comment is optional,
            including if you select Other.
          </p>
          <div className="space-y-1">
            {reasonOptions.map((option) => (
              <label key={option.code} className="flex items-start gap-2.5 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 size-3.5 accent-blue-600"
                  checked={selected.includes(option.code)}
                  onChange={() =>
                    setSelected((current) => toggleUnsubscribeReason(current, option.code))
                  }
                />
                <span className="text-[13px] leading-snug text-slate-800">{option.label}</span>
              </label>
            ))}
          </div>
          <label className="block pt-1">
            <span className="mb-1 block text-[12px] font-medium text-slate-700">
              Comment (optional)
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              disabled={busy}
              placeholder="Anything else you want us to know"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
          </label>
        </fieldset>
      ) : null}

      {subscribed && collectReasons && reasonOptions.length === 0 ? (
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-slate-700">
            Comment (optional)
          </span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            disabled={busy}
            placeholder="Anything else you want us to know"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
          />
        </label>
      ) : null}

      {message ? <p className="text-[13px] font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="text-[13px] font-medium text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        {subscribed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleUnsubscribe()}
            className="inline-flex items-center rounded-md bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Working…" : showChecklist ? "Confirm unsubscribe" : "Unsubscribe"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleResubscribe()}
            className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Working…" : "Subscribe again"}
          </button>
        )}
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400">
        This only changes email contact preference. It does not close your account or cancel a payment
        plan.
      </p>
    </Shell>
  );
}
