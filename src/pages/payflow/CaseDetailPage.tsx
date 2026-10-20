import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  getAccountWorkflowExecution,
  getPayflowAccount,
  getPayflowAccountCommunicationEligibility,
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
  PayflowCommunicationEligibility,
  PayflowReview,
  PayflowWorkflowRun,
  PayflowWorkflowUiStatus,
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

function workflowUiTone(status?: PayflowWorkflowUiStatus | null): Tone {
  switch (status) {
    case "Completed":
      return "success";
    case "In Progress":
      return "info";
    case "Scheduled":
    case "Pending":
      return "neutral";
    case "Blocked":
    case "Awaiting Review":
      return "warning";
    case "Failed":
    case "Cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

function stampMs(value?: string | null): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function normLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanUiStatus(raw?: string | null): PayflowWorkflowUiStatus | undefined {
  if (!raw) return undefined;
  const key = raw.toLowerCase().replace(/[_\s-]+/g, "");
  if (key === "pausedhumanreview") return "Awaiting Review";
  return raw;
}

function isRedundantHumanReviewLabel(label: string): boolean {
  const key = normLabel(label);
  return (
    key === "human review" ||
    key === "human review created" ||
    key === "human review required" ||
    key === "flagged for human review"
  );
}

function isHumanReviewDecisionLabel(label: string): boolean {
  const key = normLabel(label);
  return (
    key.startsWith("human review approved") ||
    key.startsWith("human review rejected") ||
    key.startsWith("human review held") ||
    key.startsWith("human review modify") ||
    key.startsWith("human review modified")
  );
}

/** File intake / account birth must lead the story even if stamp clocks disagree. */
function lifecycleRank(label: string): number {
  const key = normLabel(label);
  if (
    key === "crm import" ||
    key === "created from file upload" ||
    key === "created" ||
    key.startsWith("account created") ||
    key.includes("created from")
  ) {
    return 0;
  }
  if (key === "case received" || key === "trigger") return 1;
  return 2;
}

/** Normalize legacy intake labels for display. */
function displayTimelineLabel(label: string, source?: string | null): string {
  const key = normLabel(label);
  if (key === "crm refresh" || key === "updated from file upload") {
    return "Updated from file upload";
  }
  if (
    source === "file_upload" ||
    key === "crm import" ||
    key === "created from file upload" ||
    key === "created from crm daily file"
  ) {
    return "Created from file upload";
  }
  if (key === "created" || key.startsWith("account created")) return "Created";
  return label;
}

function runStatusTone(status?: string | null): Tone {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "success";
    case "active":
      return "info";
    case "waiting":
    case "pausedhumanreview":
      return "warning";
    case "failed":
    case "cancelled":
    case "superseded":
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
  atMs: number;
  label: string;
  detail: string;
  reviewId?: number;
  communicationId?: number;
  uiStatus?: PayflowWorkflowUiStatus;
  href?: string;
};

export function PayFlowCaseDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<PayflowAccount | null>(null);
  const [reviews, setReviews] = useState<PayflowReview[]>([]);
  const [comms, setComms] = useState<PayflowCommunication[]>([]);
  const [eligibility, setEligibility] = useState<PayflowCommunicationEligibility | null>(null);
  const [execution, setExecution] = useState<PayflowWorkflowRun | null>(null);
  const [executionLoading, setExecutionLoading] = useState(true);
  const [executionError, setExecutionError] = useState("");
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
      setEligibility(null);
      setExecution(null);
      setSideLoading(false);
      setExecutionLoading(false);
      return;
    }
    let cancelled = false;
    setSideLoading(true);
    setExecutionLoading(true);
    setExecutionError("");
    Promise.all([
      listPayflowReviews({
        client_id: account.client_id,
        search: account.account_reference,
      }),
      listPayflowComms({ account_id: account.id }),
      getPayflowAccountCommunicationEligibility(account.id).catch(() => null),
      getAccountWorkflowExecution(account.id).catch((err) => {
        if (!cancelled) {
          setExecutionError(
            err instanceof ApiError ? err.detail : "Failed to load workflow execution",
          );
        }
        return { execution: null };
      }),
    ])
      .then(([reviewRes, commRes, eligibilityRes, execRes]) => {
        if (cancelled) return;
        setReviews(
          (reviewRes.reviews || []).filter((r) => r.account_id === account.id),
        );
        setComms(commRes.communications || []);
        setEligibility(eligibilityRes);
        setExecution(execRes.execution || null);
      })
      .catch(() => {
        if (!cancelled) {
          setReviews([]);
          setComms([]);
          setEligibility(null);
          setExecution(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSideLoading(false);
          setExecutionLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  const timeline = useMemo(() => {
    if (!account) return [] as TimelineEvent[];

    const coveredCommIds = new Set<number>();
    const events: TimelineEvent[] = [];

    // 1) Workflow execution is the spine (step status + links).
    for (const e of execution?.activity || []) {
      const communicationId = e.communication_id || undefined;
      const reviewId =
        e.human_review_id ||
        (e.kind === "Human Review" ? execution?.human_review_id || undefined : undefined);
      if (communicationId) coveredCommIds.add(communicationId);
      const rawAt = e.at || "";
      events.push({
        at: rawAt ? formatStamp(rawAt) : "—",
        atMs: stampMs(rawAt),
        label: e.label || e.kind || "Workflow step",
        detail: e.block_reason || e.error || e.detail || "",
        uiStatus: cleanUiStatus(e.ui_status),
        communicationId,
        reviewId,
        href: communicationId
          ? `/payflow/comms/${communicationId}`
          : reviewId
            ? `/payflow/review/${reviewId}`
            : undefined,
      });
    }

    const hasExecutionHumanReview = events.some(
      (ev) =>
        normLabel(ev.label).includes("human review") ||
        ev.uiStatus === "Awaiting Review" ||
        !!ev.reviewId,
    );

    // 2) Account timeline — keep CRM / decisions; drop HR create duplicates.
    for (const e of account.timeline || []) {
      const label = e.label || "";
      if (hasExecutionHumanReview && isRedundantHumanReviewLabel(label)) continue;
      if (!isHumanReviewDecisionLabel(label) && isRedundantHumanReviewLabel(label) && reviews.length > 0) {
        continue;
      }
      const rawAt = e.at || "";
      const reviewId = e.review_id || undefined;
      events.push({
        at: rawAt ? formatStamp(rawAt) : rawAt || "—",
        atMs: stampMs(rawAt),
        label: displayTimelineLabel(label, e.source),
        detail: e.detail || "",
        reviewId,
        href: reviewId ? `/payflow/review/${reviewId}` : undefined,
      });
    }

    // 3) Communication events — only if this send is not already on the spine.
    for (const c of comms) {
      if (coveredCommIds.has(c.id)) continue;
      coveredCommIds.add(c.id);
      const rawAt = c.created_at || c.events?.[0]?.at || "";
      events.push({
        at: rawAt ? formatStamp(rawAt) : [c.date_label, c.time_label].filter(Boolean).join(" ") || "—",
        atMs: stampMs(rawAt),
        label: `${c.channel} · ${c.purpose}`,
        detail: c.status,
        communicationId: c.id,
        href: `/payflow/comms/${c.id}`,
        uiStatus: c.status === "Failed" ? "Failed" : undefined,
      });
    }

    // 4) Reviews — merge into existing HR spine row; otherwise add one clean row each.
    for (const r of reviews) {
      const existing = events.find(
        (ev) =>
          ev.reviewId === r.id ||
          (!ev.reviewId &&
            (normLabel(ev.label).includes("human review") || ev.uiStatus === "Awaiting Review")),
      );
      if (existing) {
        existing.reviewId = r.id;
        existing.href = `/payflow/review/${r.id}`;
        if (!existing.detail) {
          existing.detail = [r.reason, r.proposed_action].filter(Boolean).join(" · ");
        } else if (r.reason && !existing.detail.toLowerCase().includes(r.reason.toLowerCase())) {
          existing.detail = `${existing.detail} · ${r.reason}`;
        }
        if (!existing.uiStatus && r.status === "Awaiting Review") {
          existing.uiStatus = "Awaiting Review";
        }
        if (normLabel(existing.label) === "human review created") {
          existing.label = "Human review";
        }
        continue;
      }
      const rawAt = r.created_at || "";
      events.push({
        at: rawAt ? formatStamp(rawAt) : r.waiting_label || "—",
        atMs: stampMs(rawAt),
        label: "Human review",
        detail: [r.reason, r.rule_name ? `Rule: ${r.rule_name}` : "", r.proposed_action]
          .filter(Boolean)
          .join(" · "),
        reviewId: r.id,
        href: `/payflow/review/${r.id}`,
        uiStatus:
          r.status === "Awaiting Review"
            ? "Awaiting Review"
            : r.status === "On Hold"
              ? "Blocked"
              : undefined,
      });
    }

    // Origin (file upload / created) first, then chronological for the rest.
    events.sort((a, b) => {
      const rankDiff = lifecycleRank(a.label) - lifecycleRank(b.label);
      if (rankDiff !== 0) return rankDiff;
      if (a.atMs !== b.atMs) return a.atMs - b.atMs;
      return a.label.localeCompare(b.label);
    });

    // Final pass: collapse near-duplicate HR rows that slipped through.
    const merged: TimelineEvent[] = [];
    for (const ev of events) {
      const prev = merged[merged.length - 1];
      const sameHrCluster =
        prev &&
        Math.abs((prev.atMs || 0) - (ev.atMs || 0)) < 5 * 60 * 1000 &&
        isRedundantHumanReviewLabel(prev.label) &&
        isRedundantHumanReviewLabel(ev.label);
      if (sameHrCluster && prev) {
        prev.reviewId = prev.reviewId || ev.reviewId;
        prev.href = prev.href || ev.href;
        prev.uiStatus = prev.uiStatus || ev.uiStatus;
        if (ev.detail && !prev.detail) prev.detail = ev.detail;
        if (normLabel(prev.label) === "human review created") prev.label = "Human review";
        continue;
      }
      merged.push(ev);
    }
    return merged;
  }, [account, comms, reviews, execution]);

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
            {(account.human_review || reviews.length > 0) &&
            (account.collection_status || "").toLowerCase() !== "human review" ? (
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

          <Panel
            title="Workflow Execution"
            description="Assigned workflow version, run status, current step and next scheduled action"
            action={
              execution?.workflow_definition_path ? (
                <Link
                  to={execution.workflow_definition_path}
                  className="text-[12px] font-medium text-primary hover:underline"
                >
                  Open workflow
                </Link>
              ) : hasWorkflow ? (
                <Link
                  to="/payflow/workflows"
                  className="text-[12px] font-medium text-primary hover:underline"
                >
                  Workflows
                </Link>
              ) : null
            }
          >
            {executionLoading ? (
              <p className="text-[13px] text-muted-foreground">Loading execution…</p>
            ) : null}
            {!executionLoading && executionError ? (
              <p className="text-[13px] text-destructive">{executionError}</p>
            ) : null}
            {!executionLoading && !executionError && !execution ? (
              <EmptyState
                title="No workflow execution"
                description={
                  hasWorkflow
                    ? `Account shows “${account.current_workflow}” but no run is recorded yet.`
                    : "No workflow is assigned to this collection case."
                }
              />
            ) : null}
            {!executionLoading && execution ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-foreground">
                    {execution.strategy_name || account.current_workflow || "Workflow"}
                  </span>
                  <StatusPill tone={runStatusTone(execution.status)}>
                    {execution.status}
                  </StatusPill>
                  {execution.strategy_version != null ? (
                    <StatusPill tone="neutral">v{execution.strategy_version}</StatusPill>
                  ) : null}
                </div>
                {(execution.block_reason || execution.last_error) &&
                ["Blocked", "Failed", "Waiting", "PausedHumanReview", "Cancelled"].some(
                  (s) =>
                    execution.status === s ||
                    (execution.block_reason || "").length > 0,
                ) ? (
                  <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-foreground">
                    {execution.block_reason || execution.last_error}
                  </p>
                ) : null}
                <dl className="mt-3 divide-y divide-border border-t border-border">
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-[13px] text-muted-foreground">Current step</dt>
                    <dd className="text-right text-[13px] font-medium text-foreground">
                      {execution.current_step?.title ||
                        execution.current_step_id ||
                        "—"}
                      {execution.current_step?.kind
                        ? ` · ${execution.current_step.kind}`
                        : ""}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-[13px] text-muted-foreground">Next scheduled</dt>
                    <dd className="text-right text-[13px] font-medium text-foreground">
                      {execution.next_step_title || execution.next_step_id || "—"}
                      {execution.next_scheduled_at
                        ? ` · ${formatStamp(execution.next_scheduled_at)}`
                        : ""}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-[13px] text-muted-foreground">Last / next action</dt>
                    <dd className="text-right text-[13px] font-medium text-foreground">
                      {account.last_action || "—"}
                      {account.next_action ? ` → ${account.next_action}` : ""}
                    </dd>
                  </div>
                  {execution.human_review_id ? (
                    <div className="flex items-center justify-between gap-4 py-2">
                      <dt className="text-[13px] text-muted-foreground">Human review</dt>
                      <dd className="text-right text-[13px] font-medium">
                        <Link
                          to={`/payflow/review/${execution.human_review_id}`}
                          className="text-primary hover:underline"
                        >
                          Open review #{execution.human_review_id}
                        </Link>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </>
            ) : null}
          </Panel>
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

          <Panel
            title="Activity Timeline"
            description="Triggered steps, communications, waits, decisions, payments and outcomes"
          >
            {sideLoading || executionLoading ? (
              <p className="text-[13px] text-muted-foreground">Loading activity…</p>
            ) : null}
            {!sideLoading && !executionLoading && visibleTimeline.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No activity recorded yet.</p>
            ) : null}
            {!sideLoading && !executionLoading && visibleTimeline.length > 0 ? (
              <ol className="relative space-y-4 pl-5">
                <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" />
                {visibleTimeline.map((event, index) => (
                  <li key={`${event.at}-${event.label}-${index}`} className="relative min-w-0">
                    <span className="absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-card bg-primary/70" />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-medium text-foreground">{event.label}</p>
                      {event.uiStatus ? (
                        <StatusPill tone={workflowUiTone(event.uiStatus)}>
                          {event.uiStatus}
                        </StatusPill>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.at}</p>
                    {event.detail ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {event.detail}
                      </p>
                    ) : null}
                    {event.href || event.reviewId || event.communicationId ? (
                      <Link
                        to={
                          event.href ||
                          (event.reviewId
                            ? `/payflow/review/${event.reviewId}`
                            : `/payflow/comms/${event.communicationId}`)
                        }
                        className="mt-1 inline-block text-[11px] font-medium text-primary hover:underline"
                      >
                        {event.reviewId
                          ? "Open review"
                          : event.communicationId
                            ? "Open communication"
                            : "Open"}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
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
          workflowName={execution?.strategy_name || account.current_workflow}
          title="Workflow Map"
          description="The live visual strategy for this case. Click any step to review or adjust it."
        />

        {(eligibility?.latest_restriction_reason ||
          eligibility?.email?.eligibility_status === "Blocked" ||
          eligibility?.sms?.eligibility_status === "Blocked") && (
          <Panel
            title="Communication eligibility"
            description="Current send gates for this account"
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusPill
                tone={
                  eligibility.email?.ok === false ||
                  eligibility.email?.eligibility_status === "Blocked"
                    ? "danger"
                    : "success"
                }
              >
                Email · {eligibility.email?.eligibility_status || (eligibility.email?.ok ? "Eligible" : "—")}
              </StatusPill>
              <StatusPill
                tone={
                  eligibility.sms?.ok === false ||
                  eligibility.sms?.eligibility_status === "Blocked"
                    ? "danger"
                    : "success"
                }
              >
                SMS · {eligibility.sms?.eligibility_status || (eligibility.sms?.ok ? "Eligible" : "—")}
              </StatusPill>
            </div>
            {eligibility.latest_restriction_reason ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-foreground">
                {eligibility.latest_restriction_reason}
              </p>
            ) : null}
            {eligibility.next_eligible_at ? (
              <p className="mt-2 text-[12px] text-muted-foreground">
                Next eligible · {formatStamp(eligibility.next_eligible_at)}
              </p>
            ) : null}
            {eligibility.rule_id && eligibility.can_view_rule ? (
              <Link
                to={`/payflow/rules/${eligibility.rule_id}`}
                className="mt-2 inline-block text-[13px] font-medium text-primary hover:underline"
              >
                View rule · {eligibility.rule_name || eligibility.rule_code || `#${eligibility.rule_id}`}
              </Link>
            ) : null}
            {eligibility.communication_id ? (
              <Link
                to={`/payflow/comms/${eligibility.communication_id}`}
                className="mt-2 ml-3 inline-block text-[13px] font-medium text-primary hover:underline"
              >
                Open blocked communication
              </Link>
            ) : null}
          </Panel>
        )}

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
                    <Link
                      to={`/payflow/comms/${c.id}`}
                      className="text-[13px] font-semibold text-primary hover:underline"
                    >
                      {c.channel} · {c.purpose}
                    </Link>
                    <StatusPill tone={commStatusTone(c.status)}>{c.status}</StatusPill>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[c.date_label, c.time_label].filter(Boolean).join(" · ") || "—"}
                    {c.workflow_name ? ` · ${c.workflow_name}` : ""}
                    {c.engagement_tracking === "not_available"
                      ? " · Not available"
                      : c.engagement
                        ? ` · ${c.engagement}`
                        : " · Not trackable"}
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
