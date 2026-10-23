import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  cancelPaymentAttempt,
  getPaymentAttempt,
  initiatePaymentPortal,
  mockPaymentOutcome,
  resolvePaymentPortal,
} from "../../api/publicPay";
import type {
  PayflowPaymentAttempt,
  PayflowPaymentPortalOption,
  PayflowPaymentPortalResolve,
} from "../../types";
import { resolveAvatarUrl } from "../../components/ui/UserAvatar";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function PortalShell({
  brand,
  children,
}: {
  brand?: PayflowPaymentPortalResolve["brand"];
  children: ReactNode;
}) {
  const name = brand?.name || "PayFlow";
  const logoSrc = resolveAvatarUrl(brand?.logo_url);
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#e8eefc_0%,#f4f6fb_45%,#eef1f7_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-center gap-3">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              className="h-10 w-10 rounded-md object-contain bg-white shadow-sm"
              onError={(e) => {
                // Hide broken icon if asset 404s; initials fallback via parent re-render not needed —
                // swap to initials block.
                const el = e.currentTarget;
                el.style.display = "none";
                const fallback = el.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "grid";
              }}
            />
          ) : null}
          <div
            className="grid h-10 w-10 place-items-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground"
            style={logoSrc ? { display: "none" } : undefined}
          >
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold tracking-tight text-foreground">
              {name}
            </p>
            {brand?.on_behalf_of ? (
              <p className="text-[12px] text-muted-foreground">
                Collecting on behalf of {brand.on_behalf_of}
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">Secure payment</p>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-10 pb-4 text-center text-[11px] text-muted-foreground">
          Card details are collected by the payment provider — never stored in PayFlow.
        </footer>
      </div>
    </div>
  );
}

export function CustomerPaymentPortalPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const previewMode = searchParams.get("preview") === "1" || token.startsWith("preview.");
  const [portal, setPortal] = useState<PayflowPaymentPortalResolve | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [partialAmount, setPartialAmount] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid payment link");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    resolvePaymentPortal(token, { preview: previewMode })
      .then((res) => {
        if (cancelled) return;
        setPortal(res);
        const first = res.payment_options?.[0];
        if (first) {
          setSelectedId(first.id);
          if (first.amount_editable && first.min_amount != null) {
            setPartialAmount(String(first.min_amount));
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Unable to load payment link");
          setPortal(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, previewMode]);

  const selected: PayflowPaymentPortalOption | undefined = useMemo(
    () => portal?.payment_options?.find((o) => o.id === selectedId),
    [portal, selectedId],
  );

  const chargeAmount = useMemo(() => {
    if (!selected || !portal) return null;
    if (selected.amount_editable) {
      const n = Number(partialAmount);
      return Number.isFinite(n) ? n : null;
    }
    return selected.amount ?? portal.case.outstanding_balance;
  }, [selected, partialAmount, portal]);

  async function handleContinue() {
    if (!portal?.usable || !selected || chargeAmount == null) return;
    setSummaryOpen(true);
    setActionError("");
  }

  async function handleConfirmPay() {
    if (!token || !selected || chargeAmount == null || initiating) return;
    if (portal?.preview_mode || previewMode) {
      setActionError("Preview only — checkout is disabled.");
      return;
    }
    setInitiating(true);
    setActionError("");
    try {
      const attempt = await initiatePaymentPortal(token, {
        option_id: selected.id,
        amount: selected.amount_editable ? chargeAmount : undefined,
        idempotency_key: `portal-${token.slice(0, 12)}-${selected.id}-${chargeAmount}-${Date.now()}`,
      });
      if (attempt.checkout_url) {
        window.location.assign(attempt.checkout_url);
        return;
      }
      setActionError("Payment could not be started. Please try again.");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail : "Failed to start payment");
    } finally {
      setInitiating(false);
    }
  }

  const isPreview = Boolean(portal?.preview_mode || previewMode);

  if (loading) {
    return (
      <PortalShell>
        <p className="text-sm text-muted-foreground">Loading your payment options…</p>
      </PortalShell>
    );
  }

  if (error || !portal) {
    return (
      <PortalShell>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl font-semibold text-foreground">Link unavailable</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {error || "This payment link could not be found."}
          </p>
        </div>
      </PortalShell>
    );
  }

  if (!portal.usable && !isPreview) {
    return (
      <PortalShell brand={portal.brand}>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            {portal.status}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">
            Payment not available
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {portal.block_reason || "This payment link cannot be used."}
          </p>
          {portal.case.account_reference ? (
            <p className="mt-4 text-[13px] text-muted-foreground">
              Reference · {portal.case.account_reference}
            </p>
          ) : null}
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell brand={portal.brand}>
      <div className="space-y-5">
        {isPreview ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[13px] text-foreground">
            Staff preview — options are shown for review. Checkout cannot be started.
          </div>
        ) : null}
        <div>
          <p className="text-[13px] text-muted-foreground">
            Hello{portal.customer.display_name ? `, ${portal.customer.display_name}` : ""}
          </p>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight text-foreground">
            Make a payment
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Account {portal.case.account_reference || "—"} · choose how you’d like to pay.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <p className="text-[12px] text-muted-foreground">Outstanding balance</p>
          <p className="mt-1 font-display text-3xl font-semibold tabular text-foreground">
            {formatMoney(portal.case.outstanding_balance, portal.case.currency_code)}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-[13px] font-medium text-foreground">Payment options</p>
          {portal.payment_options.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No payment options are available.</p>
          ) : (
            portal.payment_options.map((opt) => {
              const active = opt.id === selectedId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(opt.id);
                    setSummaryOpen(false);
                    if (opt.amount_editable && opt.min_amount != null) {
                      setPartialAmount(String(opt.min_amount));
                    }
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-foreground">{opt.label}</p>
                      {opt.description ? (
                        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                          {opt.description}
                        </p>
                      ) : null}
                      {active && opt.type === "payment_plan" && opt.schedule?.length ? (
                        <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
                          {opt.schedule.map((row) => (
                            <li
                              key={row.sequence}
                              className="flex justify-between gap-2 text-[11px] text-muted-foreground"
                            >
                              <span>
                                #{row.sequence}
                                {row.sequence === 1 ? " (today)" : ""} · due {row.due_date}
                              </span>
                              <span className="tabular">
                                {formatMoney(row.amount, opt.currency_code)}
                              </span>
                            </li>
                          ))}
                          <li className="pt-1 text-[11px] font-medium text-foreground">
                            Total payable{" "}
                            {formatMoney(
                              opt.total_payable ?? portal.case.outstanding_balance,
                              opt.currency_code,
                            )}
                          </li>
                        </ul>
                      ) : null}
                    </div>
                    {!opt.amount_editable && opt.amount != null ? (
                      <p className="shrink-0 text-[14px] font-semibold tabular text-foreground">
                        {formatMoney(opt.amount, opt.currency_code)}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {(portal.active_payment_plans?.length || 0) > 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[13px] font-medium text-foreground">Your active payment plan</p>
            {portal.active_payment_plans!.map((plan) => (
              <div key={plan.id} className="mt-2 text-[12px] text-muted-foreground">
                <p>
                  {plan.label || plan.id} · {plan.status} · paid{" "}
                  {formatMoney(plan.amount_paid, plan.currency_code)} of{" "}
                  {formatMoney(plan.total_payable, plan.currency_code)}
                </p>
                {plan.next_due_date ? <p className="mt-0.5">Next due {plan.next_due_date}</p> : null}
                <p className="mt-0.5">Future instalments are not charged automatically.</p>
              </div>
            ))}
          </div>
        ) : null}

        {selected?.amount_editable ? (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <label className="text-[12px] text-muted-foreground" htmlFor="partial-amount">
              Amount ({portal.case.currency_code})
            </label>
            <input
              id="partial-amount"
              type="number"
              inputMode="decimal"
              min={selected.min_amount}
              max={selected.max_amount}
              step="0.01"
              value={partialAmount}
              onChange={(e) => {
                setPartialAmount(e.target.value);
                setSummaryOpen(false);
              }}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-[15px] tabular text-foreground"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Between {formatMoney(selected.min_amount || 0, portal.case.currency_code)} and{" "}
              {formatMoney(selected.max_amount || 0, portal.case.currency_code)}
            </p>
          </div>
        ) : null}

        {!summaryOpen ? (
          <button
            type="button"
            disabled={
              isPreview || !selected || chargeAmount == null || !portal.provider?.ready
            }
            onClick={() => void handleContinue()}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-[14px] font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
          >
            {isPreview ? "Preview only" : "Continue"}
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[13px] font-semibold text-foreground">Payment summary</p>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Option</dt>
                <dd className="font-medium text-foreground">{selected?.label}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Amount due now</dt>
                <dd className="font-semibold tabular text-foreground">
                  {formatMoney(chargeAmount || 0, portal.case.currency_code)}
                </dd>
              </div>
              {selected?.type === "payment_plan" && selected.total_payable != null ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Plan total</dt>
                  <dd className="tabular text-foreground">
                    {formatMoney(selected.total_payable, portal.case.currency_code)}
                    {selected.installments
                      ? ` · ${selected.installments} ${selected.frequency || "monthly"}`
                      : ""}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Account</dt>
                <dd className="text-foreground">{portal.case.account_reference}</dd>
              </div>
            </dl>
            {portal.provider?.message ? (
              <p className="text-[12px] text-amber-700">{portal.provider.message}</p>
            ) : null}
            {actionError ? <p className="text-[12px] text-destructive">{actionError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={initiating}
                onClick={() => void handleConfirmPay()}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-primary text-[14px] font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
              >
                {initiating ? "Starting…" : "Pay securely"}
              </button>
              <button
                type="button"
                disabled={initiating}
                onClick={() => setSummaryOpen(false)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-border bg-card text-[14px] font-semibold text-foreground"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {!portal.provider?.ready && portal.provider?.message ? (
          <p className="text-[12px] text-muted-foreground">{portal.provider.message}</p>
        ) : null}
      </div>
    </PortalShell>
  );
}

export function CustomerPaymentCheckoutPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const attemptId = params.get("attempt") || "";
  const [attempt, setAttempt] = useState<PayflowPaymentAttempt | null>(null);
  const [brand, setBrand] = useState<PayflowPaymentPortalResolve["brand"]>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !attemptId) {
      setError("Missing checkout session");
      return;
    }
    let cancelled = false;
    Promise.all([
      getPaymentAttempt(token, attemptId),
      resolvePaymentPortal(token).catch(() => null),
    ])
      .then(([att, portal]) => {
        if (cancelled) return;
        setAttempt(att);
        if (portal) setBrand(portal.brand);
        if (att.confirmed) {
          window.location.replace(`/pay/${token}/result?attempt=${attemptId}&outcome=success`);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Checkout unavailable");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, attemptId]);

  async function finish(outcome: "success" | "failed" | "cancel") {
    if (!token || !attemptId || busy) return;
    setBusy(true);
    try {
      await mockPaymentOutcome(token, attemptId, outcome);
      window.location.assign(`/pay/${token}/result?attempt=${attemptId}&outcome=${outcome}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not complete mock payment");
      setBusy(false);
    }
  }

  return (
    <PortalShell brand={brand}>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-foreground">Secure checkout</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Development mock — Stripe keys are not configured. No card details are collected.
        </p>
        {error ? <p className="mt-3 text-[13px] text-destructive">{error}</p> : null}
        {attempt ? (
          <div className="mt-5 space-y-2 text-[14px]">
            <p>
              Amount{" "}
              <span className="font-semibold tabular">
                {formatMoney(attempt.amount, attempt.currency_code)}
              </span>
            </p>
            <p className="text-[12px] text-muted-foreground">Status · {attempt.status}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void finish("success")}
                className="h-11 rounded-md bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-50"
              >
                Simulate successful payment
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void finish("failed")}
                className="h-11 rounded-md border border-border bg-card text-[14px] font-semibold text-foreground disabled:opacity-50"
              >
                Simulate failure
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void finish("cancel")}
                className="h-11 text-[13px] font-medium text-muted-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : !error ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : null}
      </div>
    </PortalShell>
  );
}

export function CustomerPaymentResultPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const attemptId = params.get("attempt") || "";
  const outcomeHint = (params.get("outcome") || "").toLowerCase();
  const [attempt, setAttempt] = useState<PayflowPaymentAttempt | null>(null);
  const [brand, setBrand] = useState<PayflowPaymentPortalResolve["brand"]>();
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!token || !attemptId) {
      setError("Missing payment reference");
      setPolling(false);
      return;
    }
    let cancelled = false;
    let tries = 0;

    async function tick() {
      try {
        const [att, portal] = await Promise.all([
          getPaymentAttempt(token, attemptId),
          resolvePaymentPortal(token).catch(() => null),
        ]);
        if (cancelled) return;
        setAttempt(att);
        if (portal) setBrand(portal.brand);

        if (outcomeHint === "cancel" && att.status === "Processing") {
          await cancelPaymentAttempt(token, attemptId).catch(() => null);
          const refreshed = await getPaymentAttempt(token, attemptId);
          if (!cancelled) setAttempt(refreshed);
          setPolling(false);
          return;
        }

        const terminal = ["Succeeded", "Failed", "Cancelled", "Expired"].includes(att.status);
        if (terminal || att.confirmed) {
          setPolling(false);
          return;
        }
        tries += 1;
        // Each poll triggers BE Stripe reconcile for stuck Processing.
        if (tries >= 40) {
          setPolling(false);
          return;
        }
        window.setTimeout(() => {
          void tick();
        }, 2000);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Unable to confirm payment");
          setPolling(false);
        }
      }
    }

    void tick();
    return () => {
      cancelled = true;
    };
  }, [token, attemptId, outcomeHint]);

  const status = attempt?.status || (polling ? "Processing" : "Unknown");
  const confirmed = Boolean(attempt?.confirmed);

  let title = "Confirming payment…";
  let body = "We’re verifying the result with the payment provider. Please wait.";
  if (confirmed || status === "Succeeded") {
    title = "Payment confirmed";
    body = "Your payment was verified successfully. Thank you.";
  } else if (status === "Failed") {
    title = "Payment failed";
    body = attempt?.error_message || "The payment could not be completed.";
  } else if (status === "Cancelled") {
    title = "Payment cancelled";
    body = "No charge was completed. You can return to the portal and try again.";
  } else if (status === "Expired") {
    title = "Checkout expired";
    body = "This checkout session expired. Return to the portal to start again.";
  } else if (!polling && !confirmed) {
    title = "Still processing";
    body =
      "We have not received a confirmed result yet. If you completed payment, it may take a moment to appear.";
  }

  return (
    <PortalShell brand={brand}>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {status}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
        {error ? <p className="mt-3 text-[13px] text-destructive">{error}</p> : null}
        {attempt && (confirmed || status === "Succeeded") ? (
          <div className="mt-5 space-y-1 rounded-md border border-border bg-surface px-3 py-3 text-[13px]">
            <p>
              Amount{" "}
              <span className="font-semibold tabular">
                {formatMoney(attempt.amount, attempt.currency_code)}
              </span>
            </p>
            <p className="text-muted-foreground">
              Reference · {attempt.reference || attempt.id.slice(0, 12)}
            </p>
          </div>
        ) : null}
        {polling ? (
          <p className="mt-4 text-[12px] text-muted-foreground">Checking provider confirmation…</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          {!confirmed && status !== "Succeeded" ? (
            <Link
              to={`/pay/${token}`}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary text-[14px] font-semibold text-primary-foreground"
            >
              Return to payment portal
            </Link>
          ) : null}
        </div>
      </div>
    </PortalShell>
  );
}
