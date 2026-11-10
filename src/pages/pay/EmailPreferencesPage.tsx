import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  resubscribeEmailPreference,
  resolveEmailPreference,
  unsubscribeEmailPreference,
  type PayflowEmailPreferencePublic,
} from "../../api/publicEmailPreferences";

function Shell({
  brand,
  children,
}: {
  brand?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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

  useEffect(() => {
    if (!token) {
      setError("This preference link is invalid.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
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
    try {
      const res = await unsubscribeEmailPreference(token);
      setPref(res);
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

  return (
    <Shell brand={pref?.brand_name}>
      <h1 className="text-[18px] font-semibold text-slate-900">
        {subscribed ? "Manage email updates" : "You are unsubscribed"}
      </h1>
      <p className="text-[14px] leading-relaxed text-slate-600">
        {subscribed
          ? `Stop receiving collection emails${pref?.email_masked ? ` at ${pref.email_masked}` : ""}${
              pref?.account_reference ? ` for account ${pref.account_reference}` : ""
            }.`
          : `You will not receive further collection emails${
              pref?.email_masked ? ` at ${pref.email_masked}` : ""
            }. You can subscribe again below if you change your mind.`}
      </p>

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
            {busy ? "Working…" : "Unsubscribe"}
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
