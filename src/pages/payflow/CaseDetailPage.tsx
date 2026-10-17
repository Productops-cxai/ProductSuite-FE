import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  getPayflowAccount,
  listPayflowComms,
  listPayflowReviews,
} from "../../api/payflow";
import { WorkflowFlowPanel } from "../../components/payflow/WorkflowFlowPanel";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusPill,
  statusTone,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import type {
  PayflowAccount,
  PayflowCommunication,
  PayflowReview,
} from "../../types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStamp(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function yn(value?: boolean | null) {
  if (value == null) return "—";
  return value ? "Yes" : "No";
}

function reviewStatusTone(status: string): Tone {
  switch (status) {
    case "Awaiting Review":
      return "warning";
    case "Approved":
    case "Completed":
      return "success";
    case "Modified":
      return "info";
    case "Rejected":
      return "danger";
    default:
      return "neutral";
  }
}

function commStatusTone(status: string): Tone {
  switch (status) {
    case "Payment Link Clicked":
      return "success";
    case "Opened / Read":
      return "info";
    case "Delivered":
    case "Sent":
      return "neutral";
    case "Awaiting Governance":
      return "warning";
    case "Failed":
    case "Suppressed":
      return "danger";
    default:
      return "neutral";
  }
}

function FactRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="divide-y divide-border">
      {rows.map((f) => (
        <div key={f.label} className="flex items-start justify-between gap-6 px-4 py-2.5">
          <dt className="shrink-0 text-[13px] text-muted-foreground">{f.label}</dt>
          <dd className="tabular min-w-0 text-right text-[13px] font-medium break-words text-foreground">
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DetailGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[12px] text-muted-foreground">{f.label}</dt>
          <dd className="mt-0.5 text-[13px] font-medium break-words text-foreground">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type TimelineEvent = {
  at: string;
  label: string;
  detail: string;
  reviewId?: number;
};

export function PayFlowCaseDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<PayflowAccount | null>(null);
  const [reviews, setReviews] = useState<PayflowReview[]>([]);
  const [comms, setComms] = useState<PayflowCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [sideLoading, setSideLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  useEffect(() => {
    const id = Number(accountId);
    if (!Number.isFinite(id)) {
      setError("Account not found");
      setLoading(false);
      setSideLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getPayflowAccount(id)
      .then((res) => {
        if (!cancelled) setAccount(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load account");
          setAccount(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    if (!account) {
      setReviews([]);
      setComms([]);
      setSideLoading(false);
      return;
    }
    let cancelled = false;
    setSideLoading(true);
    Promise.all([
      listPayflowReviews({
        client_id: account.client_id,
        search: account.account_reference,
      }),
      listPayflowComms({ account_id: account.id }),
    ])
      .then(([reviewRes, commRes]) => {
        if (cancelled) return;
        setReviews(
          (reviewRes.reviews || []).filter((r) => r.account_id === account.id),
        );
        setComms(commRes.communications || []);
      })
      .catch(() => {
        if (!cancelled) {
          setReviews([]);
          setComms([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSideLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  const timeline = useMemo(() => {
    if (!account) return [] as TimelineEvent[];
    const base: TimelineEvent[] = (account.timeline || []).map((e) => ({
      at: e.at,
      label: e.label,
      detail: e.detail,
    }));
    const fromComms: TimelineEvent[] = comms.flatMap((c) =>
      (c.events || []).map((e) => ({
        at: e.at,
        label: e.label,
        detail: e.detail || `${c.channel} · ${c.purpose}`,
      })),
    );
    const fromReviews: TimelineEvent[] = reviews.map((r) => ({
      at: r.created_at ? formatStamp(r.created_at) : r.waiting_label || "—",
      label: r.reason,
      detail: `Rule: ${r.rule_name || "—"} · Proposed: ${r.proposed_action}`,
      reviewId: r.id,
    }));
    return [...base, ...fromComms, ...fromReviews];
  }, [account, comms, reviews]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading account…</p>;
  }

  if (error || !account) {
    return (
      <Panel title="No access to this account">
        <p className="text-sm text-muted-foreground">
          {error || "This account either does not exist or is outside your access scope."}
        </p>
        <Link to="/payflow/cases" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to accounts
        </Link>
      </Panel>
    );
  }

  const summaryFacts = [
    { label: "Client", value: account.client_name || "—" },
    { label: "Sub-Client", value: account.portfolio_name || "—" },
    { label: "Product", value: account.product_code || "—" },
    { label: "Customer / Customer Account", value: account.customer_name },
    { label: "Account Reference", value: account.account_reference },
    { label: "Collection Case", value: account.case_reference },
    { label: "Original Balance", value: formatCurrency(account.original_balance) },
    { label: "Outstanding Balance", value: formatCurrency(account.outstanding_balance) },
    { label: "Amount Recovered", value: formatCurrency(account.recovered_balance) },
    { label: "Last Action", value: account.last_action || "—" },
    { label: "Next Action", value: account.next_action || "—" },
  ];

  const identityFacts = [
    { label: "CRM Case ID", value: account.crm_case_id || "—" },
    { label: "Customer / Debtor ID", value: account.debtor_id || "—" },
    { label: "Client Reference Number", value: account.client_reference_number || "—" },
    { label: "Age group", value: account.age_group || "—" },
    { label: "Employment status", value: account.employment_status || "—" },
    { label: "Income band", value: account.income_band || "—" },
    { label: "Education level", value: account.education_level || "—" },
    { label: "Customer segment", value: account.customer_segment || "—" },
    { label: "Date of birth", value: account.date_of_birth || "—" },
    { label: "Language", value: account.language || "—" },
  ];

  const listingFacts = [
    { label: "Date listed", value: account.date_listed || "—" },
    { label: "Date incurred", value: account.date_incurred || "—" },
    { label: "Delinquency date", value: account.delinquency_date || "—" },
    { label: "Days past due", value: account.days_past_due == null ? "—" : String(account.days_past_due) },
    { label: "Due date", value: account.due_date || "—" },
    {
      label: "Paid amount (to date)",
      value: account.paid_amount != null ? formatCurrency(account.paid_amount) : "—",
    },
    {
      label: "Settlement rate",
      value: account.settlement_rate != null ? `${account.settlement_rate}%` : "—",
    },
    {
      label: "Commission rate",
      value: account.commission_rate != null ? `${account.commission_rate}%` : "—",
    },
    { label: "Currency", value: account.currency_code || "—" },
    { label: "Source updated at", value: formatStamp(account.source_updated_at) },
  ];

  const contactFacts = [
    {
      label: "Address",
      value:
        [account.address_line1, account.city, account.province_state, account.postal_code]
          .filter(Boolean)
          .join(", ") || "—",
    },
    { label: "Region", value: account.region || "—" },
    { label: "Country", value: account.country_code || "—" },
    { label: "Email", value: account.email || "—" },
    { label: "Email consent", value: yn(account.email_consent) },
    { label: "Mobile", value: account.phone_mobile || "—" },
    { label: "Work phone", value: account.phone_work || "—" },
    { label: "Provincial / communication hold", value: yn(account.provincial_hold) },
    { label: "Hold days", value: account.hold_days == null ? "—" : String(account.hold_days) },
    { label: "Last email sent", value: account.last_email_sent_date || "—" },
    { label: "Last SMS sent", value: account.last_sms_sent_date || "—" },
    { label: "Last contact", value: account.last_contact_date || "—" },
    {
      label: "Last payment",
      value: account.last_payment_date
        ? `${account.last_payment_amount != null ? formatCurrency(account.last_payment_amount) : "—"} on ${account.last_payment_date}`
        : "—",
    },
    { label: "Last payment was PTP", value: yn(account.last_payment_is_ptp) },
    { label: "PTP code", value: account.ptp_code || "—" },
    {
      label: "PTP amount / due",
      value: account.ptp_code
        ? `${account.ptp_amount != null ? formatCurrency(account.ptp_amount) : "—"} · ${account.ptp_due_date || "—"}`
        : "—",
    },
  ];

  const visibleTimeline = showAllTimeline ? timeline : timeline.slice(0, 6);
  const hiddenCount = Math.max(0, timeline.length - 6);
  const hasWorkflow = Boolean(account.current_workflow);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Accounts / Cases", to: "/payflow/cases" },
          { label: account.client_name || "Client" },
          { label: account.customer_name },
        ]}
        title={account.customer_name}
        description={`Account ${account.account_reference} · Case ${account.case_reference} · Last updated from CRM: ${formatStamp(account.last_crm_refresh_at || account.updated_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill tone={statusTone(account.collection_status)}>
              {account.collection_status}
            </StatusPill>
            {account.human_review || reviews.length > 0 ? (
              <StatusPill tone="danger">Human review</StatusPill>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <Panel title="Case Summary" bodyClassName="p-0">
            <FactRows rows={summaryFacts} />
          </Panel>

          <Panel
            title="Customer profile"
            description="Demographics and identity fields from CRM"
          >
            <DetailGrid rows={identityFacts} />
          </Panel>

          <Panel
            title="Listing & balances"
            description="Placement dates, delinquency and commercial terms"
          >
            <DetailGrid rows={listingFacts} />
          </Panel>

          <Panel
            title="Contact & engagement"
            description="Reachability, holds and recent outreach"
          >
            <DetailGrid rows={contactFacts} />
          </Panel>

          {hasWorkflow ? (
            <Panel
              title="Current Workflow"
              description="The collection strategy currently applied to this case"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-foreground">
                  {account.current_workflow}
                </span>
              </div>
              <dl className="mt-3 divide-y divide-border border-t border-border">
                <div className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-[13px] text-muted-foreground">Collection Status</dt>
                  <dd className="text-[13px] font-medium text-foreground">
                    {account.collection_status || "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-[13px] text-muted-foreground">Last Action</dt>
                  <dd className="text-[13px] font-medium text-foreground">
                    {account.last_action || "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-[13px] text-muted-foreground">Next Planned Action</dt>
                  <dd className="text-[13px] font-medium text-foreground">
                    {account.next_action || "—"}
                  </dd>
                </div>
              </dl>
            </Panel>
          ) : null}
        </div>

        <div className="min-w-0 space-y-5">
          <Panel
            title="Human Review"
            description="Governance exceptions raised on this collection case"
            bodyClassName={reviews.length > 0 ? "p-0" : undefined}
            action={
              <Link
                to="/payflow/review"
                className="text-[12px] font-medium text-primary hover:underline"
              >
                Open queue
              </Link>
            }
          >
            {sideLoading ? (
              <p className="text-[13px] text-muted-foreground">Loading reviews…</p>
            ) : null}
            {!sideLoading && reviews.length === 0 ? (
              <div className="rounded-md border border-border/60 bg-secondary/40 px-3.5 py-3">
                <p className="text-[13px] font-medium text-foreground">
                  {account.human_review
                    ? "Flagged for human review"
                    : "No open review items"}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {account.human_review
                    ? "This case is marked for supervisor attention. Matching queue items will show here once raised."
                    : "No human review items are open for this case."}
                </p>
              </div>
            ) : null}
            {!sideLoading && reviews.length > 0 ? (
              <ul className="divide-y divide-border">
                {reviews.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={`/payflow/review/${r.id}`}
                        className="min-w-0 text-[13px] font-semibold text-primary hover:underline"
                      >
                        {r.reason}
                      </Link>
                      <StatusPill tone={reviewStatusTone(r.status)}>{r.status}</StatusPill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Rule: {r.rule_name || "—"} · Proposed: {r.proposed_action}
                    </p>
                    {r.waiting_label ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Waiting {r.waiting_label}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <Panel title="Activity Timeline">
            {visibleTimeline.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ol className="relative space-y-4 pl-5">
                <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" />
                {visibleTimeline.map((event, index) => (
                  <li key={`${event.at}-${event.label}-${index}`} className="relative min-w-0">
                    <span className="absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-card bg-primary/70" />
                    <p className="text-[13px] font-medium text-foreground">{event.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.at}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {event.detail}
                    </p>
                    {event.reviewId ? (
                      <Link
                        to={`/payflow/review/${event.reviewId}`}
                        className="mt-1 inline-block text-[11px] font-medium text-primary hover:underline"
                      >
                        Open review
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
            {hiddenCount > 0 ? (
              <button
                type="button"
                className="mt-4 text-[12px] font-medium text-primary hover:underline"
                onClick={() => setShowAllTimeline((v) => !v)}
              >
                {showAllTimeline ? "Show less" : `Show ${hiddenCount} more events`}
              </button>
            ) : null}
          </Panel>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <WorkflowFlowPanel
          clientId={account.client_id}
          workflowName={account.current_workflow}
          title="Workflow Map"
          description="The live visual strategy for this case. Click any step to review or adjust it."
        />

        <Panel
          title="Communications"
          description="Actions executed as part of the current strategy"
          bodyClassName={comms.length > 0 ? "p-0" : undefined}
        >
          {sideLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading communications…</p>
          ) : null}
          {!sideLoading && comms.length === 0 ? (
            <EmptyState
              title="No communications yet"
              description="Outbound reminders and payment links for this case will appear here when the strategy sends them."
            />
          ) : null}
          {!sideLoading && comms.length > 0 ? (
            <ul className="divide-y divide-border">
              {comms.map((c) => (
                <li key={c.id} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-foreground">
                      {c.channel} · {c.purpose}
                    </p>
                    <StatusPill tone={commStatusTone(c.status)}>{c.status}</StatusPill>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[c.date_label, c.time_label].filter(Boolean).join(" · ") || "—"}
                    {c.workflow_name ? ` · ${c.workflow_name}` : ""}
                    {c.engagement ? ` · ${c.engagement}` : " · Not trackable"}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      </div>
    </>
  );
}
