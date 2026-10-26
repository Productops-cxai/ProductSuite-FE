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

type PortalStep =
  | "options"
  | "full"
  | "partial"
  | "plan-select"
  | "plan-detail"
  | "next"
  | "review";

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

function formatDateLabel(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    // ISO date-only
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
    }
    return value;
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function maskRef(ref?: string | null, masked?: string | null) {
  if (masked) return masked;
  const raw = (ref || "").trim();
  if (!raw) return "—";
  if (raw.length <= 4) return `•••• ${raw}`;
  return `•••• ${raw.slice(-4)}`;
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function LockIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ShieldIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3 5 6v5c0 4.2 2.9 7.9 7 9 4.1-1.1 7-4.8 7-9V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-3.8" />
    </svg>
  );
}

function CheckCircleIcon({ className = "size-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}

function CalendarClockIcon({ className = "size-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <circle cx="12" cy="15" r="3" />
      <path d="M12 14v1.5l1 1" />
    </svg>
  );
}

function AlertCircleIcon({ className = "size-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5h.01" />
    </svg>
  );
}

function SecurityNote({ brandName }: { brandName: string }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
      <ShieldIcon />
      Secure payment on behalf of {brandName}
    </p>
  );
}

function StepCard({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>
      <h1 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h1>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular font-semibold text-foreground",
          emphasis ? "text-[18px]" : "text-[14px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RowPlain({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3",
        !last && "border-b border-border",
      )}
    >
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="tabular text-[14px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

function PortalShell({
  brand,
  children,
}: {
  brand?: PayflowPaymentPortalResolve["brand"] | PayflowPaymentAttempt["brand"] | null;
  children: ReactNode;
}) {
  const name = brand?.name || "PayFlow";
  const logoSrc = resolveAvatarUrl(brand?.logo_url);
  const supportName = brand?.client_name || brand?.on_behalf_of || name;
  const supportBits = [
    brand?.support_phone,
    brand?.support_email,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-primary px-5 py-5 text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                className="h-8 w-8 rounded-md object-contain bg-white/15"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <div className="min-w-0">
              <span className="block truncate text-[17px] font-bold tracking-tight">{name}</span>
              {brand?.on_behalf_of ? (
                <span className="block truncate text-[11px] opacity-85">
                  On behalf of {brand.on_behalf_of}
                </span>
              ) : null}
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] opacity-90">
            <LockIcon /> Secure Payment
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 sm:py-8">{children}</main>

      <footer className="mx-auto max-w-lg px-4 pb-10 text-center">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Need help? Contact {supportName}
          {supportBits.length ? ` · ${supportBits.join(" · ")}` : " customer support using the details on your statement."}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Card details are collected by the payment provider — never stored in PayFlow.
        </p>
      </footer>
    </div>
  );
}

const PLAN_NOTE =
  "Future instalments are not charged automatically. You will receive a reminder before each due date.";

export function CustomerPaymentPortalPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const previewMode = searchParams.get("preview") === "1" || token.startsWith("preview.");
  const [portal, setPortal] = useState<PayflowPaymentPortalResolve | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<PortalStep>("options");
  const [selectedId, setSelectedId] = useState<string>("");
  const [partialAmount, setPartialAmount] = useState("");
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

  const currency = portal?.case.currency_code || "USD";
  const outstanding = portal?.case.outstanding_balance ?? 0;
  const firstName = (portal?.customer.display_name || "there").split(" ")[0];

  const fullOpt = useMemo(
    () => portal?.payment_options.find((o) => o.type === "pay_in_full"),
    [portal],
  );
  const partialOpt = useMemo(
    () => portal?.payment_options.find((o) => o.type === "partial"),
    [portal],
  );
  const planOpts = useMemo(
    () => portal?.payment_options.filter((o) => o.type === "payment_plan") || [],
    [portal],
  );
  const nextOpt = useMemo(
    () => portal?.payment_options.find((o) => o.type === "pay_next_instalment"),
    [portal],
  );

  const selected: PayflowPaymentPortalOption | undefined = useMemo(
    () => portal?.payment_options?.find((o) => o.id === selectedId),
    [portal, selectedId],
  );

  const partialValue = useMemo(() => {
    const n = Number(partialAmount);
    if (!Number.isFinite(n)) return 0;
    const min = partialOpt?.min_amount ?? 0;
    const max = partialOpt?.max_amount ?? outstanding;
    return Math.min(Math.max(n, 0), max || outstanding);
  }, [partialAmount, partialOpt, outstanding]);

  const remainingAfterPartial = Math.max(outstanding - partialValue, 0);

  const chargeAmount = useMemo(() => {
    if (!selected || !portal) return null;
    if (selected.amount_editable) {
      if (partialValue < (selected.min_amount || 0)) return null;
      if (selected.max_amount != null && partialValue > selected.max_amount) return null;
      return partialValue > 0 ? partialValue : null;
    }
    return selected.amount ?? portal.case.outstanding_balance;
  }, [selected, partialValue, portal]);

  const isPreview = Boolean(portal?.preview_mode || previewMode);
  const brandName = portal?.brand?.name || "PayFlow";

  const accentBtn =
    "w-full rounded-lg bg-primary px-4 py-3 text-[15px] font-semibold text-primary-foreground shadow-brand transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50";
  const outlineBtn =
    "w-full rounded-lg border border-border-strong bg-card px-4 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-surface";

  function goReview(option: PayflowPaymentPortalOption) {
    setSelectedId(option.id);
    setActionError("");
    setStep("review");
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
        <div className="space-y-3 text-center">
          <AlertCircleIcon className="mx-auto size-12 text-warning" />
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">Link unavailable</h1>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {error || "This payment link could not be found."}
          </p>
        </div>
      </PortalShell>
    );
  }

  if (!portal.usable && !isPreview) {
    return (
      <PortalShell brand={portal.brand}>
        <div className="space-y-3 text-center">
          <AlertCircleIcon className="mx-auto size-12 text-warning" />
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            {portal.status}
          </p>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Payment not available
          </h1>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {portal.block_reason || "This payment link cannot be used."}
          </p>
          {portal.case.account_reference ? (
            <p className="text-[13px] text-muted-foreground">
              Reference · {maskRef(portal.case.account_reference, portal.case.account_reference_masked)}
            </p>
          ) : null}
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell brand={portal.brand}>
      {isPreview ? (
        <div className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[13px] text-foreground">
          Staff preview — options are shown for review. Checkout cannot be started.
        </div>
      ) : null}

      {step === "options" && (
        <section className="space-y-5">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
              Payment Details
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
              Hello {firstName}, you currently have an outstanding balance associated with your
              account.
            </p>
          </div>

          <dl className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
              <dt className="text-[13px] text-muted-foreground">Account Reference</dt>
              <dd className="tabular text-[14px] font-medium text-foreground">
                {maskRef(portal.case.account_reference, portal.case.account_reference_masked)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
              <dt className="text-[13px] text-muted-foreground">Outstanding Balance</dt>
              <dd className="tabular text-[14px] font-medium text-foreground">
                {formatMoney(outstanding, currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-[13px] font-medium text-foreground">Amount Due</dt>
              <dd className="tabular text-[18px] font-semibold text-foreground">
                {formatMoney(outstanding, currency)}
              </dd>
            </div>
          </dl>

          <div className="space-y-2.5">
            {fullOpt ? (
              <button
                type="button"
                className={accentBtn}
                onClick={() => {
                  setSelectedId(fullOpt.id);
                  setStep("full");
                }}
              >
                Pay in Full · {formatMoney(fullOpt.amount ?? outstanding, currency)}
              </button>
            ) : null}
            {partialOpt ? (
              <button
                type="button"
                className={outlineBtn}
                onClick={() => {
                  setSelectedId(partialOpt.id);
                  if (partialOpt.min_amount != null) {
                    setPartialAmount(String(partialOpt.min_amount));
                  }
                  setStep("partial");
                }}
              >
                Make a Partial Payment
              </button>
            ) : null}
            {planOpts.length > 0 ? (
              <button
                type="button"
                className={outlineBtn}
                onClick={() => {
                  setSelectedId(planOpts[0].id);
                  setStep("plan-select");
                }}
              >
                Set Up a Payment Plan
              </button>
            ) : null}
            {nextOpt ? (
              <button
                type="button"
                className={outlineBtn}
                onClick={() => {
                  setSelectedId(nextOpt.id);
                  setStep("next");
                }}
              >
                Pay next instalment
                {nextOpt.amount != null ? ` · ${formatMoney(nextOpt.amount, currency)}` : ""}
              </button>
            ) : null}
            {!fullOpt && !partialOpt && planOpts.length === 0 && !nextOpt ? (
              <p className="text-[13px] text-muted-foreground">No payment options are available.</p>
            ) : null}
          </div>

          {(portal.active_payment_plans?.length || 0) > 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-left">
              <p className="text-[13px] font-medium text-foreground">Your active payment plan</p>
              {portal.active_payment_plans!.map((plan) => (
                <div key={plan.id} className="mt-2 text-[12px] text-muted-foreground">
                  <p>
                    {plan.label || plan.id} · {plan.status} · paid{" "}
                    {formatMoney(plan.amount_paid, plan.currency_code)} of{" "}
                    {formatMoney(plan.total_payable, plan.currency_code)}
                  </p>
                  {plan.next_due_date ? (
                    <p className="mt-0.5">Next due {formatDateLabel(plan.next_due_date)}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <SecurityNote brandName={brandName} />
        </section>
      )}

      {step === "full" && fullOpt && (
        <StepCard title="Pay in Full" onBack={() => setStep("options")}>
          <Row
            label="Amount to Pay"
            value={formatMoney(fullOpt.amount ?? outstanding, currency)}
            emphasis
          />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            You will enter your card details securely with the payment provider on the next step.
          </p>
          <button
            type="button"
            className={accentBtn}
            onClick={() => goReview(fullOpt)}
          >
            Continue to Payment
          </button>
        </StepCard>
      )}

      {step === "partial" && partialOpt && (
        <StepCard title="Make a Partial Payment" onBack={() => setStep("options")}>
          <Row label="Outstanding Balance" value={formatMoney(outstanding, currency)} />
          <div>
            <label
              htmlFor="partial-amount"
              className="mb-1.5 block text-[13px] font-medium text-foreground"
            >
              Payment Amount
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-card px-3 py-2.5">
              <span className="text-[15px] text-muted-foreground">$</span>
              <input
                id="partial-amount"
                inputMode="decimal"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                className="tabular w-full bg-transparent text-[15px] text-foreground outline-none"
              />
            </div>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Between {formatMoney(partialOpt.min_amount || 0, currency)} and{" "}
              {formatMoney(partialOpt.max_amount || outstanding, currency)}
            </p>
          </div>
          <Row
            label="Remaining Balance after payment"
            value={formatMoney(remainingAfterPartial, currency)}
          />
          <button
            type="button"
            className={cn(accentBtn, (!(chargeAmount && chargeAmount > 0) || (partialOpt.min_amount != null && partialValue < partialOpt.min_amount)) && "opacity-50")}
            disabled={
              !chargeAmount ||
              chargeAmount <= 0 ||
              (partialOpt.min_amount != null && partialValue < partialOpt.min_amount)
            }
            onClick={() => goReview(partialOpt)}
          >
            Continue
          </button>
        </StepCard>
      )}

      {step === "plan-select" && (
        <StepCard title="Select a payment plan" onBack={() => setStep("options")}>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Tip: choose a plan that fits your pay cycle so you can stay on top of your balance.
          </p>
          <div className="space-y-2.5">
            {planOpts.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSelectedId(option.id);
                  setStep("plan-detail");
                }}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                  selectedId === option.id
                    ? "border-foreground bg-card"
                    : "border-border bg-card hover:bg-surface",
                )}
              >
                <p className="text-[14px] font-semibold text-foreground">{option.label}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {option.installments} {option.frequency || "monthly"} payments · today{" "}
                  {formatMoney(option.amount || 0, currency)}
                </p>
              </button>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{PLAN_NOTE}</p>
        </StepCard>
      )}

      {step === "plan-detail" && selected?.type === "payment_plan" && (
        <StepCard title="Payment plan details" onBack={() => setStep("plan-select")}>
          <Row label="Outstanding Balance" value={formatMoney(outstanding, currency)} />
          <Row
            label="Instalment Amount (today)"
            value={formatMoney(selected.amount || 0, currency)}
            emphasis
          />
          <Row label="Number of Payments" value={String(selected.installments || "—")} />
          <Row
            label="Frequency"
            value={(selected.frequency || "monthly").replace(/^\w/, (c) => c.toUpperCase())}
          />
          {selected.schedule?.length ? (
            <>
              <Row
                label="First Payment"
                value={formatDateLabel(selected.schedule[0]?.due_date)}
              />
              <Row
                label="Final Payment"
                value={formatDateLabel(selected.schedule[selected.schedule.length - 1]?.due_date)}
              />
              <ul className="space-y-1 rounded-lg border border-border bg-card px-4 py-3">
                {selected.schedule.map((row) => (
                  <li
                    key={row.sequence}
                    className="flex justify-between gap-2 text-[12px] text-muted-foreground"
                  >
                    <span>
                      #{row.sequence}
                      {row.sequence === 1 ? " (today)" : ""} · {formatDateLabel(row.due_date)}
                    </span>
                    <span className="tabular text-foreground">
                      {formatMoney(row.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <button type="button" className={accentBtn} onClick={() => goReview(selected)}>
            Continue
          </button>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{PLAN_NOTE}</p>
        </StepCard>
      )}

      {step === "next" && nextOpt && (
        <StepCard title="Pay next instalment" onBack={() => setStep("options")}>
          <Row
            label="Amount due now"
            value={formatMoney(nextOpt.amount || 0, currency)}
            emphasis
          />
          {nextOpt.description ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">{nextOpt.description}</p>
          ) : null}
          <button type="button" className={accentBtn} onClick={() => goReview(nextOpt)}>
            Continue to Payment
          </button>
        </StepCard>
      )}

      {step === "review" && selected && (
        <StepCard
          title={selected.type === "payment_plan" ? "Payment Plan Review" : "Payment Summary"}
          onBack={() => {
            if (selected.type === "partial") setStep("partial");
            else if (selected.type === "payment_plan") setStep("plan-detail");
            else if (selected.type === "pay_next_instalment") setStep("next");
            else setStep("full");
          }}
        >
          {selected.type === "payment_plan" ? (
            <>
              <Row label="Outstanding Balance" value={formatMoney(outstanding, currency)} />
              <Row label="Plan" value={selected.label} />
              <Row
                label="Instalment Amount"
                value={formatMoney(selected.amount || 0, currency)}
                emphasis
              />
              <Row label="Number of Payments" value={String(selected.installments || "—")} />
              {selected.schedule?.length ? (
                <>
                  <Row
                    label="First Payment"
                    value={formatDateLabel(selected.schedule[0]?.due_date)}
                  />
                  <Row
                    label="Final Payment"
                    value={formatDateLabel(
                      selected.schedule[selected.schedule.length - 1]?.due_date,
                    )}
                  />
                </>
              ) : null}
              <Row
                label="Amount due now"
                value={formatMoney(chargeAmount || 0, currency)}
              />
            </>
          ) : (
            <>
              <Row
                label="Amount"
                value={formatMoney(chargeAmount || 0, currency)}
                emphasis
              />
              <Row
                label="Account"
                value={maskRef(portal.case.account_reference, portal.case.account_reference_masked)}
              />
              <Row label="Option" value={selected.label} />
              {selected.type === "partial" ? (
                <Row
                  label="Remaining Balance"
                  value={formatMoney(remainingAfterPartial, currency)}
                />
              ) : null}
            </>
          )}

          {portal.provider?.message ? (
            <p className="text-[12px] text-amber-700">{portal.provider.message}</p>
          ) : null}
          {actionError ? <p className="text-[12px] text-destructive">{actionError}</p> : null}

          <button
            type="button"
            className={accentBtn}
            disabled={
              isPreview ||
              initiating ||
              chargeAmount == null ||
              !portal.provider?.ready
            }
            onClick={() => void handleConfirmPay()}
          >
            {isPreview
              ? "Preview only"
              : initiating
                ? "Starting…"
                : selected.type === "payment_plan"
                  ? "Confirm Payment Plan"
                  : `Pay ${formatMoney(chargeAmount || 0, currency)}`}
          </button>
          {selected.type === "payment_plan" ? (
            <p className="text-[12px] leading-relaxed text-muted-foreground">{PLAN_NOTE}</p>
          ) : (
            <SecurityNote brandName={brandName} />
          )}
        </StepCard>
      )}
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
        if (att.brand) setBrand(att.brand);
        else if (portal) setBrand(portal.brand);
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

  const accentBtn =
    "w-full rounded-lg bg-primary px-4 py-3 text-[15px] font-semibold text-primary-foreground disabled:opacity-50";
  const outlineBtn =
    "w-full rounded-lg border border-border-strong bg-card px-4 py-3 text-[14px] font-medium text-foreground disabled:opacity-50";

  return (
    <PortalShell brand={brand || attempt?.brand}>
      <section className="space-y-5">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Secure checkout
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Development mock — Stripe keys are not configured. No card details are collected.
          </p>
        </div>
        {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
        {attempt ? (
          <div className="space-y-4">
            <Row
              label="Amount"
              value={formatMoney(attempt.amount, attempt.currency_code)}
              emphasis
            />
            <p className="text-[12px] text-muted-foreground">Status · {attempt.status}</p>
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void finish("success")}
                className={accentBtn}
              >
                Simulate successful payment
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void finish("failed")}
                className={outlineBtn}
              >
                Simulate failure
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void finish("cancel")}
                className="w-full py-2 text-[13px] font-medium text-muted-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : !error ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : null}
      </section>
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
        if (att.brand) setBrand(att.brand);
        else if (portal) setBrand(portal.brand);

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
  const confirmed = Boolean(attempt?.confirmed || status === "Succeeded");
  const isPlan = attempt?.option_type === "payment_plan";
  const currency = attempt?.currency_code || "USD";
  const brandName = brand?.name || attempt?.brand?.name || "PayFlow";
  const remaining =
    attempt?.remaining_balance ??
    attempt?.outstanding_balance ??
    null;

  const outlineBtn =
    "w-full rounded-lg border border-border-strong bg-card px-4 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-surface";
  const accentBtn =
    "w-full rounded-lg bg-primary px-4 py-3 text-[15px] font-semibold text-primary-foreground shadow-brand transition-opacity hover:opacity-90";

  if (error && !attempt) {
    return (
      <PortalShell brand={brand}>
        <div className="space-y-5 text-center">
          <AlertCircleIcon className="mx-auto size-12 text-warning" />
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
              Unable to confirm payment
            </h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">{error}</p>
          </div>
          <Link to={`/pay/${token}`} className={accentBtn + " inline-flex items-center justify-center"}>
            Return to payment portal
          </Link>
        </div>
      </PortalShell>
    );
  }

  if (polling && !confirmed) {
    return (
      <PortalShell brand={brand || attempt?.brand}>
        <div className="space-y-5 text-center">
          <div className="mx-auto size-12 animate-pulse rounded-full bg-primary/15" />
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
              Confirming payment…
            </h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              We’re verifying the result with the payment provider. Please wait.
            </p>
          </div>
          <p className="text-[12px] text-muted-foreground">Checking provider confirmation…</p>
        </div>
      </PortalShell>
    );
  }

  if (confirmed && isPlan) {
    const plan = attempt?.plan;
    return (
      <PortalShell brand={brand || attempt?.brand}>
        <section className="space-y-5 text-center">
          <CalendarClockIcon className="mx-auto size-12 text-success" />
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
              Payment Plan Confirmed
            </h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              Thank you. Your payment arrangement has been set up.
            </p>
          </div>
          <dl className="overflow-hidden rounded-xl border border-border bg-card text-left">
            <RowPlain
              label="Plan Amount"
              value={formatMoney(plan?.total_payable ?? attempt?.balance_at_initiation ?? attempt?.amount ?? 0, currency)}
            />
            <RowPlain
              label="Frequency"
              value={(plan?.frequency || "monthly").replace(/^\w/, (c) => c.toUpperCase())}
            />
            <RowPlain
              label="Instalment Amount"
              value={formatMoney(plan?.installment_amount ?? attempt?.amount ?? 0, currency)}
            />
            <RowPlain
              label="Number of Payments"
              value={String(plan?.installments_total ?? "—")}
            />
            <RowPlain
              label="First Payment"
              value={formatDateLabel(plan?.start_date || attempt?.paid_at || attempt?.completed_at)}
            />
            <RowPlain
              label="Final Payment"
              value={formatDateLabel(
                plan?.final_payment_date ||
                  plan?.installments?.[plan.installments.length - 1]?.due_date,
              )}
            />
            <RowPlain
              label="Amount paid today"
              value={formatMoney(attempt?.amount || 0, currency)}
            />
            <RowPlain
              label="Payment Method"
              value={attempt?.payment_method || "Card"}
              last
            />
          </dl>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{PLAN_NOTE}</p>
          <button type="button" className={outlineBtn} onClick={() => window.print()}>
            View Receipt
          </button>
          <Link to={`/pay/${token}`} className={outlineBtn + " inline-flex items-center justify-center"}>
            Return
          </Link>
          <SecurityNote brandName={brandName} />
        </section>
      </PortalShell>
    );
  }

  if (confirmed) {
    const paid = attempt?.amount || 0;
    const showRemaining = remaining != null && remaining > 0.009;
    return (
      <PortalShell brand={brand || attempt?.brand}>
        <section className="space-y-5 text-center">
          <CheckCircleIcon className="mx-auto size-12 text-success" />
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
              Payment Successful
            </h1>
            <p className="tabular mt-1 text-[26px] font-semibold text-foreground">
              {formatMoney(paid, currency)}
            </p>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              Thank you. Your payment has been received.
            </p>
          </div>
          <dl className="overflow-hidden rounded-xl border border-border bg-card text-left">
            <RowPlain
              label="Payment Reference"
              value={attempt?.reference || attempt?.id?.slice(0, 12) || "—"}
            />
            <RowPlain
              label="Date"
              value={formatDateLabel(attempt?.paid_at || attempt?.completed_at || attempt?.created_at)}
            />
            <RowPlain label="Amount Paid" value={formatMoney(paid, currency)} />
            {showRemaining ? (
              <RowPlain label="Remaining Balance" value={formatMoney(remaining!, currency)} />
            ) : null}
            <RowPlain
              label="Account"
              value={
                attempt?.account_reference_masked ||
                maskRef(attempt?.account_reference) ||
                "—"
              }
            />
            <RowPlain
              label="Payment Method"
              value={attempt?.payment_method || "Card"}
              last
            />
          </dl>
          {showRemaining ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Your remaining balance is {formatMoney(remaining!, currency)}. We will be in touch
              about the rest of your balance.
            </p>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Your balance is now cleared. No further payment is required.
            </p>
          )}
          <div className="space-y-2.5">
            <button type="button" className={outlineBtn} onClick={() => window.print()}>
              View Receipt
            </button>
            <Link to={`/pay/${token}`} className={outlineBtn + " inline-flex items-center justify-center"}>
              Return
            </Link>
          </div>
          <SecurityNote brandName={brandName} />
        </section>
      </PortalShell>
    );
  }

  // Failed / cancelled / expired / still processing
  const failed = status === "Failed";
  const cancelled = status === "Cancelled";
  const expired = status === "Expired";

  let title = "Still processing";
  let body =
    "We have not received a confirmed result yet. If you completed payment, it may take a moment to appear.";
  if (failed) {
    title = "Payment Could Not Be Completed";
    body =
      attempt?.error_message ||
      "Your payment was not processed. No amount has been taken.";
  } else if (cancelled) {
    title = "Payment cancelled";
    body = "No charge was completed. You can return to the portal and try again.";
  } else if (expired) {
    title = "Checkout expired";
    body = "This checkout session expired. Return to the portal to start again.";
  }

  return (
    <PortalShell brand={brand || attempt?.brand}>
      <section className="space-y-5 text-center">
        <AlertCircleIcon className="mx-auto size-12 text-warning" />
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">{body}</p>
        </div>
        {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
        <div className="space-y-2.5">
          <Link to={`/pay/${token}`} className={accentBtn + " inline-flex items-center justify-center"}>
            {failed ? "Try Again" : "Return to payment portal"}
          </Link>
          {failed ? (
            <Link
              to={`/pay/${token}`}
              className={outlineBtn + " inline-flex items-center justify-center"}
            >
              Choose Another Payment Option
            </Link>
          ) : null}
        </div>
        <SecurityNote brandName={brandName} />
      </section>
    </PortalShell>
  );
}
