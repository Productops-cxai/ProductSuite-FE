import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  approvePayflowReview,
  getPayflowReview,
  holdPayflowReview,
  modifyPayflowReview,
  rejectPayflowReview,
} from "../../api/payflow";
import { WorkflowFlowPanel } from "../../components/payflow/WorkflowFlowPanel";
import {
  Btn,
  Field,
  PageHeader,
  Panel,
  SectionHeading,
  SelectInput,
  StatusPill,
  TextArea,
  TextInput,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { Modal } from "../../components/ui/Modal";
import type { PayflowReview } from "../../types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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
    case "On Hold":
      return "warning";
    default:
      return "neutral";
  }
}

function priorityTone(priority: string): Tone {
  if (priority === "High") return "danger";
  if (priority === "Medium") return "warning";
  return "neutral";
}

const PROPOSED_ACTIONS = [
  "Move to stronger collection treatment",
  "Change communication strategy",
  "Modify payment treatment",
  "Send settlement offer",
  "Continue current treatment with adjusted communication",
  "Hold collection activity pending dispute review",
  "Pause outreach and request updated contact details",
];

const REJECTION_REASONS = [
  "Not appropriate for customer context",
  "Insufficient information",
  "Incorrect treatment",
  "Client policy consideration",
  "Other",
];

type DecisionMode = "approve" | "modify" | "reject" | "hold" | null;

const COMPLETED_STATUSES = ["Approved", "Modified", "Rejected", "Completed"];

type PendingDecision =
  | { mode: "approve"; note: string }
  | { mode: "modify"; action: string; guidance: string }
  | { mode: "reject"; reason: string; comment: string }
  | { mode: "hold"; until: string; reason: string };

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function PayFlowReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const [review, setReview] = useState<PayflowReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<DecisionMode>(null);
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    const id = Number(reviewId);
    if (!Number.isFinite(id)) {
      setError("Review not found");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPayflowReview(id)
      .then((res) => {
        if (!cancelled) setReview(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load review");
          setReview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  function askConfirm(decision: PendingDecision) {
    if (busy || submitting.current) return;
    setError("");
    setPending(decision);
  }

  async function submitPending() {
    if (!review || !pending || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let updated: PayflowReview;
      if (pending.mode === "approve") {
        updated = await approvePayflowReview(review.id, { note: pending.note || undefined });
      } else if (pending.mode === "modify") {
        updated = await modifyPayflowReview(review.id, {
          action: pending.action,
          guidance: pending.guidance,
        });
      } else if (pending.mode === "reject") {
        updated = await rejectPayflowReview(review.id, {
          reason: pending.reason,
          comment: pending.comment,
        });
      } else {
        updated = await holdPayflowReview(review.id, {
          until: pending.until,
          reason: pending.reason,
        });
      }
      let fresh = updated;
      try {
        fresh = await getPayflowReview(review.id);
      } catch {
        fresh = updated;
      }
      setReview(fresh);
      setMode(null);
      setPending(null);
      setNotice(`Decision recorded. This review is now ${fresh.status}.`);
    } catch (err) {
      setPending(null);
      setError(err instanceof ApiError ? err.detail : "Decision failed");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading review…</p>;
  if (error && !review) {
    return (
      <Panel title="Review unavailable">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link to="/payflow/review" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to human review
        </Link>
      </Panel>
    );
  }
  if (!review) return null;

  const clientLabel = review.client_name || "Client";
  const customer = review.customer_name || "Customer";
  const reference = review.account_reference || review.case_reference || "—";
  const workflowCtx = review.workflow_context;
  const execution = workflowCtx?.execution;
  const exceptionStep = review.exception_step || workflowCtx?.exception_step;
  const workflow =
    workflowCtx?.strategy_name ||
    review.current_workflow ||
    execution?.strategy_name ||
    "—";
  const workflowPath =
    workflowCtx?.workflow_definition_path ||
    execution?.workflow_definition_path ||
    (review.strategy_id ? `/payflow/workflows/${review.strategy_id}` : null);
  const awaiting = review.status === "Awaiting Review";
  const canDecide = !!review.can_decide;
  const canModify = !!review.can_modify;
  const completed = COMPLETED_STATUSES.includes(review.status);
  const decidable = canDecide && !completed;
  const explanation = review.explanation || [];
  const timeline = review.timeline || [];
  const history = review.history || [];
  const missingRefs = review.missing_refs || [];
  const close = () => setMode(null);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Human Review", to: "/payflow/review" },
          { label: `${clientLabel} · ${customer}` },
        ]}
        title="Human Review"
        description={`${clientLabel} · ${customer} · ${reference}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={priorityTone(review.priority)}>{review.priority} Priority</StatusPill>
            <StatusPill tone={reviewStatusTone(review.status)}>{review.status}</StatusPill>
          </div>
        }
      />

      <div className="panel mb-5 grid gap-4 px-5 py-4 sm:grid-cols-3">
        <HeaderFact label="Outstanding Balance" value={formatCurrency(review.outstanding_balance)} />
        <HeaderFact label="Current Workflow" value={workflow} />
        <HeaderFact
          label="Review Created"
          value={`${review.waiting_label || `${review.waiting_minutes} min`} ago`}
        />
      </div>

      {notice ? (
        <p className="mb-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </p>
      ) : null}
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      {missingRefs.length > 0 ? (
        <div className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="text-[13px] font-semibold text-foreground">
            Some linked references are unavailable
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {missingRefs.map((m) => (
              <li key={m.ref} className="text-[12px] text-muted-foreground">
                {m.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-warning/40 bg-warning/8 px-5 py-4">
            <p className="text-eyebrow">Why this requires review</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Pair label="Triggered Rule">
                {review.rule_id && review.rule_name !== "Rule unavailable" ? (
                  <Link
                    to={`/payflow/rules/${review.rule_id}`}
                    className="text-[13px] font-semibold text-primary hover:underline"
                  >
                    {review.rule_name || "View rule"}
                  </Link>
                ) : (
                  <span className="text-[13px] font-medium">{review.rule_name || "—"}</span>
                )}
              </Pair>
              <Pair label="Condition">
                <span className="text-[13px] font-medium">{review.condition_text || "—"}</span>
              </Pair>
              <Pair label="Observed Value">
                <span className="text-[13px] font-medium">{review.observed_value || "—"}</span>
              </Pair>
              <Pair label="Exception step">
                <span className="text-[13px] font-medium">
                  {exceptionStep?.title ||
                    exceptionStep?.id ||
                    review.exception_step_id ||
                    "—"}
                  {exceptionStep?.kind ? ` · ${exceptionStep.kind}` : ""}
                </span>
              </Pair>
              <Pair label="Workflow version">
                <span className="text-[13px] font-medium">
                  {review.workflow_version != null
                    ? `v${review.workflow_version}`
                    : workflowCtx?.workflow_version != null
                      ? `v${workflowCtx.workflow_version}`
                      : "—"}
                </span>
              </Pair>
              <Pair label="Result">
                <span className="text-[13px] font-medium">Require Human Review</span>
              </Pair>
            </dl>
            {exceptionStep?.message ? (
              <p className="mt-2 text-[12px] text-muted-foreground">{exceptionStep.message}</p>
            ) : null}
          </section>

          <Panel
            title="PayFlow Recommendation"
            description="Proposed action awaiting your decision"
            action={
              review.confidence != null ? (
                <StatusPill tone="ai">Confidence {Math.round(review.confidence)}%</StatusPill>
              ) : undefined
            }
          >
            <p className="text-[14px] leading-relaxed font-medium text-foreground">
              {review.proposed_action || "—"}
            </p>
            <button
              type="button"
              onClick={() => setShowExplanation((v) => !v)}
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary"
            >
              Why this action?
              <ChevronDown className={`size-3.5 transition-transform ${showExplanation ? "rotate-180" : ""}`} />
            </button>
            {showExplanation ? (
              <ul className="mt-2 space-y-1.5 rounded-lg border border-border bg-surface px-4 py-3">
                {explanation.length === 0 ? (
                  <li className="text-[12px] leading-relaxed text-muted-foreground">
                    No additional explanation was recorded for this recommendation.
                  </li>
                ) : (
                  explanation.map((line) => (
                    <li key={line} className="text-[12px] leading-relaxed text-muted-foreground">
                      {line}
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </Panel>

          {execution ? (
            <Panel
              title="Live workflow execution"
              description="Current run state for this collection case"
              action={
                workflowPath ? (
                  <Link
                    to={workflowPath}
                    className="text-[12px] font-medium text-primary hover:underline"
                  >
                    Open workflow
                  </Link>
                ) : undefined
              }
            >
              <dl className="divide-y divide-border">
                <Row label="Run status">
                  <span className="text-[12px] font-medium">{execution.status || "—"}</span>
                </Row>
                <Row label="Current step">
                  <span className="text-[12px] font-medium">
                    {execution.current_step_title || execution.current_step_id || "—"}
                    {execution.current_step_kind ? ` · ${execution.current_step_kind}` : ""}
                  </span>
                </Row>
                <Row label="Next scheduled">
                  <span className="text-[12px] font-medium">
                    {execution.next_step_title || execution.next_step_id || "—"}
                    {execution.next_scheduled_at
                      ? ` · ${new Date(execution.next_scheduled_at).toLocaleString()}`
                      : ""}
                  </span>
                </Row>
                {execution.block_reason ? (
                  <Row label="Block / pause reason">
                    <span className="text-[12px] font-medium text-amber-700 dark:text-amber-400">
                      {execution.block_reason}
                    </span>
                  </Row>
                ) : null}
              </dl>
              <Link
                to={`/payflow/cases/${review.account_id}`}
                className="mt-3 inline-block text-[12px] font-medium text-primary hover:underline"
              >
                Open collection case execution
              </Link>
            </Panel>
          ) : null}

          <WorkflowFlowPanel
            clientId={review.client_id}
            workflowName={
              workflowCtx?.strategy_name || review.current_workflow || execution?.strategy_name
            }
            title="Workflow Map"
            description={`Where this exception sits in the ${workflow || "collection"} strategy. Click any step to review or adjust it.`}
          />

          <Panel title="Recent Activity" description="Events relevant to this decision">
            {timeline.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No recent activity recorded.</p>
            ) : (
              <ol className="relative space-y-3.5 pl-5">
                <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" />
                {timeline.map((event, i) => (
                  <li key={`${event.at}-${event.label}-${i}`} className="relative">
                    <span className="absolute top-1 -left-5 size-[11px] rounded-full border-2 border-card bg-primary/70" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13px] font-medium text-foreground">{event.label}</p>
                      <span className="text-xs text-muted-foreground">{event.at}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <Link
              to={`/payflow/cases/${review.account_id}`}
              className="mt-4 inline-block text-[12px] font-medium text-primary hover:underline"
            >
              View Full History
            </Link>
          </Panel>

          <Panel
            title="Recent Communications"
            description="Customer outreach for this collection case"
            bodyClassName={(review.communications || []).length > 0 ? "p-0" : undefined}
            action={
              <Link
                to="/payflow/comms"
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                Full log
              </Link>
            }
          >
            {(review.communications || []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No communications recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {(review.communications || []).map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div>
                      <Link
                        to={`/payflow/comms/${c.id}`}
                        className="text-[13px] font-semibold text-primary hover:underline"
                      >
                        {c.channel} · {c.purpose}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[c.date_label, c.time_label].filter(Boolean).join(" · ") || c.code}
                        {c.engagement ? ` · ${c.engagement}` : " · Not trackable"}
                      </p>
                    </div>
                    <StatusPill tone={reviewStatusTone(c.status)}>{c.status}</StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Decision" description="Each decision has a distinct operational outcome">
            {!decidable ? (
              <ResolvedSummary review={review} canDecide={canDecide} />
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Btn variant="primary" onClick={() => setMode("approve")} disabled={busy || !!pending}>
                    Approve
                  </Btn>
                  {canModify ? (
                    <Btn onClick={() => setMode("modify")} disabled={busy || !!pending}>
                      Modify / Guide
                    </Btn>
                  ) : null}
                  <Btn variant="danger" onClick={() => setMode("reject")} disabled={busy || !!pending}>
                    Reject
                  </Btn>
                  <Btn onClick={() => setMode("hold")} disabled={busy || !!pending}>
                    Hold
                  </Btn>
                </div>
                {!canModify ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Guiding the recommendation requires the “Modify / Guide AI Recommendation”
                    permission for this client.
                  </p>
                ) : null}

                {mode === "approve" ? (
                  <ApprovePanel
                    review={review}
                    busy={busy || !!pending}
                    onCancel={close}
                    onConfirm={(note) => askConfirm({ mode: "approve", note })}
                  />
                ) : null}
                {mode === "modify" ? (
                  <ModifyPanel
                    review={review}
                    busy={busy || !!pending}
                    onCancel={close}
                    onConfirm={(input) => askConfirm({ mode: "modify", ...input })}
                  />
                ) : null}
                {mode === "reject" ? (
                  <RejectPanel
                    busy={busy || !!pending}
                    onCancel={close}
                    onConfirm={(input) => askConfirm({ mode: "reject", ...input })}
                  />
                ) : null}
                {mode === "hold" ? (
                  <HoldPanel
                    busy={busy || !!pending}
                    onCancel={close}
                    onConfirm={(input) => askConfirm({ mode: "hold", ...input })}
                  />
                ) : null}
              </>
            )}
          </Panel>

          <div>
            <SectionHeading title="Review History" description="Full audit trail for this decision" />
            <Panel>
              {history.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No audit events recorded yet.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((entry, i) => (
                    <li key={`${entry.at}-${i}`} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                      <span className="leading-tight">
                        <span className="block text-[12px] font-medium text-foreground">{entry.event}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {entry.at}
                          {entry.by ? ` · ${entry.by}` : ""}
                          {entry.detail ? ` · ${entry.detail}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </div>

        <div className="space-y-5">
          <Panel title="Customer & Account" bodyClassName="px-5 pb-4">
            <dl className="divide-y divide-border">
              {(
                [
                  ["Client", clientLabel],
                  ["Customer", customer],
                  ["Account", reference],
                  ["Original Balance", formatCurrency(review.original_balance)],
                  ["Outstanding Balance", formatCurrency(review.outstanding_balance)],
                  ["Amount Recovered", formatCurrency(review.recovered_balance)],
                  ["Days Past Due", String(review.days_past_due)],
                  ["Current Workflow", workflow],
                  ...(review.context || []).map((c) => [c.label, c.value] as [string, string]),
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2">
                  <dt className="text-[12px] text-muted-foreground">{label}</dt>
                  <dd className="text-right text-[12px] font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <Link
              to={`/payflow/cases/${review.account_id}`}
              className="mt-3 inline-block text-[12px] font-medium text-primary hover:underline"
            >
              View Full Collection Case
            </Link>
          </Panel>

          <Panel title="Governance">
            <dl className="divide-y divide-border">
              <Row label="Rule">
                {review.rule_id ? (
                  <Link
                    to={`/payflow/rules/${review.rule_id}`}
                    className="text-[12px] font-medium text-primary hover:underline"
                  >
                    {review.rule_name || "View rule"}
                  </Link>
                ) : (
                  <span className="text-[12px] font-medium">{review.rule_name || "—"}</span>
                )}
              </Row>
              <Row label="Requirement">
                <span className="text-[12px] font-medium">Require Human Review</span>
              </Row>
              <Row label="Client Scope">
                <Link
                  to={`/payflow/clients/${review.client_id}`}
                  className="text-[12px] font-medium text-primary hover:underline"
                >
                  {clientLabel}
                </Link>
              </Row>
            </dl>
          </Panel>

          <Panel title="Review Metadata">
            <dl className="divide-y divide-border">
              <Row label="Review ID">
                <span className="text-[12px] font-medium">{review.code || review.id}</span>
              </Row>
              <Row label="Assigned Supervisor">
                <span className="text-[12px] font-medium">{review.assigned_supervisor || "Unassigned"}</span>
              </Row>
              <Row label="Waiting">
                <span className="tabular text-[12px] font-medium">
                  {review.waiting_label || `${review.waiting_minutes} min`}
                </span>
              </Row>
              <Row label="Available actions">
                <span className="text-[12px] font-medium">
                  {(review.available_actions || []).length
                    ? (review.available_actions || []).join(", ")
                    : "—"}
                </span>
              </Row>
              {review.hold_until ? (
                <Row label="Hold Until">
                  <span className="text-[12px] font-medium">{review.hold_until}</span>
                </Row>
              ) : null}
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Approved, modified and rejected decisions are recorded as feedback for later analytics
              and workflow evaluation. A single decision does not retrain the model.
            </p>
          </Panel>
        </div>
      </div>

      <DecisionConfirm
        pending={pending}
        busy={busy}
        onClose={() => {
          if (!busy) setPending(null);
        }}
        onConfirm={() => {
          void submitPending();
        }}
      />
    </>
  );
}

function HeaderFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-eyebrow">{label}</p>
      <p className="tabular mt-1 text-[15px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DecisionConfirm({
  pending,
  busy,
  onClose,
  onConfirm,
}: {
  pending: PendingDecision | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!pending) return null;
  const lines: [string, string][] =
    pending.mode === "approve"
      ? [["Decision", "Approve recommended action"], ...(pending.note ? [["Note", pending.note] as [string, string]] : [])]
      : pending.mode === "modify"
        ? [
            ["Final action", pending.action],
            ["Reason / remarks", pending.guidance],
          ]
        : pending.mode === "reject"
          ? [
              ["Rejection reason", pending.reason],
              ["Reason / remarks", pending.comment],
            ]
          : [
              ["Hold until", pending.until],
              ["Reason / remarks", pending.reason],
            ];
  const title =
    pending.mode === "approve"
      ? "Confirm approval"
      : pending.mode === "modify"
        ? "Confirm modified treatment"
        : pending.mode === "reject"
          ? "Confirm rejection"
          : "Confirm hold";
  const confirmLabel =
    pending.mode === "approve"
      ? "Approve & Continue"
      : pending.mode === "modify"
        ? "Apply guidance"
        : pending.mode === "reject"
          ? "Reject action"
          : "Place on hold";
  return (
    <Modal
      open
      title={title}
      description="Check this decision before it is sent. The server will accept or reject it."
      onClose={onClose}
      showClose={!busy}
      overlayClassName="z-[80]"
      footer={
        <div className="mt-2 flex justify-end gap-2.5">
          <Btn variant="ghost" onClick={onClose} disabled={busy}>
            Back
          </Btn>
          <Btn
            variant={pending.mode === "reject" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Saving…" : confirmLabel}
          </Btn>
        </div>
      }
    >
      <dl className="space-y-2 text-[13px]">
        {lines.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

function DecisionBox({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-4">{children}</div>;
}

function ApprovePanel({
  review,
  busy,
  onCancel,
  onConfirm,
}: {
  review: PayflowReview;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <DecisionBox>
      <p className="text-[13px] font-semibold text-foreground">Approve this recommended action?</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {review.proposed_action} — the governance requirement is satisfied and the approved action
        proceeds on the collection case.
      </p>
      <div className="mt-3">
        <Field label="Decision note (optional)" hint="Recorded with the decision. You will confirm before it is submitted.">
          <TextArea
            value={note}
            onChange={setNote}
            placeholder="Balance verified against the latest payment file."
            disabled={busy}
          />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Btn variant="primary" disabled={busy} onClick={() => onConfirm(note.trim())}>
          {busy ? "Saving…" : "Approve & Continue"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Btn>
      </div>
    </DecisionBox>
  );
}

function ModifyPanel({
  review,
  busy,
  onCancel,
  onConfirm,
}: {
  review: PayflowReview;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (input: { action: string; guidance: string }) => void;
}) {
  const options =
    review.proposed_action && !PROPOSED_ACTIONS.includes(review.proposed_action)
      ? [review.proposed_action, ...PROPOSED_ACTIONS]
      : PROPOSED_ACTIONS;
  const [action, setAction] = useState(review.proposed_action || options[0]);
  const [guidance, setGuidance] = useState("");
  const [fieldError, setFieldError] = useState("");
  return (
    <DecisionBox>
      <p className="text-[13px] font-semibold text-foreground">Modify or guide the action</p>
      <p className="mt-1 text-[12px] text-muted-foreground">Recommended: {review.proposed_action}</p>
      <div className="mt-3 space-y-3">
        <Field label="Final action" hint="Choose a permitted treatment. The server validates this choice.">
          <SelectInput value={action} options={options} onChange={setAction} disabled={busy} />
        </Field>
        <Field label="Reason / remarks" hint="Required. Recorded with the decision.">
          <TextArea
            value={guidance}
            onChange={(value) => {
              setGuidance(value);
              if (value.trim()) setFieldError("");
            }}
            placeholder="Customer made a recent partial payment. Maintain softer tone for the next communication."
            disabled={busy}
          />
        </Field>
        {fieldError ? <p className="text-[12px] text-destructive">{fieldError}</p> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <Btn
          variant="primary"
          disabled={busy}
          onClick={() => {
            if (!guidance.trim()) {
              setFieldError("Reason / remarks is required before this decision can be submitted.");
              return;
            }
            setFieldError("");
            onConfirm({ action, guidance: guidance.trim() });
          }}
        >
          {busy ? "Saving…" : "Apply Guidance & Continue"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Btn>
      </div>
    </DecisionBox>
  );
}

function RejectPanel({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: (input: { reason: string; comment: string }) => void;
}) {
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [comment, setComment] = useState("");
  const [fieldError, setFieldError] = useState("");
  return (
    <DecisionBox>
      <p className="text-[13px] font-semibold text-foreground">Reject the proposed action</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        The recommendation will not execute. The case returns for reassessment with an alternative
        strategy.
      </p>
      <div className="mt-3 space-y-3">
        <Field label="Rejection reason">
          <SelectInput value={reason} options={REJECTION_REASONS} onChange={setReason} disabled={busy} />
        </Field>
        <Field label="Reason / remarks" hint="Required. Recorded with the decision.">
          <TextArea
            value={comment}
            onChange={(value) => {
              setComment(value);
              if (value.trim()) setFieldError("");
            }}
            placeholder="Additional context"
            disabled={busy}
          />
        </Field>
        {fieldError ? <p className="text-[12px] text-destructive">{fieldError}</p> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <Btn
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (!comment.trim()) {
              setFieldError("Reason / remarks is required before this decision can be submitted.");
              return;
            }
            setFieldError("");
            onConfirm({ reason, comment: comment.trim() });
          }}
        >
          {busy ? "Saving…" : "Reject Action"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Btn>
      </div>
    </DecisionBox>
  );
}

function HoldPanel({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: (input: { until: string; reason: string }) => void;
}) {
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");
  const [furtherReview, setFurtherReview] = useState(false);
  const [fieldError, setFieldError] = useState("");
  return (
    <DecisionBox>
      <p className="text-[13px] font-semibold text-foreground">Hold the proposed action</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Collection activity respects the hold until the review resumes.
      </p>
      <div className="mt-3 space-y-3">
        <Field label="Hold until (date / time)">
          <TextInput
            value={until}
            onChange={setUntil}
            placeholder="14 Sep 2026 · 09:00"
            disabled={furtherReview || busy}
          />
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            checked={furtherReview}
            onChange={(e) => setFurtherReview(e.target.checked)}
            disabled={busy}
          />
          Hold until further review
        </label>
        <Field label="Reason / remarks" hint="Required. Recorded with the decision.">
          <TextArea
            value={reason}
            onChange={(value) => {
              setReason(value);
              if (value.trim()) setFieldError("");
            }}
            placeholder="Customer contacted support and requested 48 hours."
            disabled={busy}
          />
        </Field>
        {fieldError ? <p className="text-[12px] text-destructive">{fieldError}</p> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <Btn
          variant="primary"
          disabled={busy}
          onClick={() => {
            const untilValue = furtherReview ? "Further review" : until.trim();
            if (!untilValue) {
              setFieldError("Enter when the hold ends, or choose hold until further review.");
              return;
            }
            if (!reason.trim()) {
              setFieldError("Reason / remarks is required before this decision can be submitted.");
              return;
            }
            setFieldError("");
            onConfirm({ until: untilValue, reason: reason.trim() });
          }}
        >
          {busy ? "Saving…" : "Place On Hold"}
        </Btn>
        <Btn variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Btn>
      </div>
    </DecisionBox>
  );
}

function ResolvedSummary({ review, canDecide }: { review: PayflowReview; canDecide: boolean }) {
  const completed = COMPLETED_STATUSES.includes(review.status);
  if (!canDecide && !completed) {
    return (
      <p className="text-[13px] text-muted-foreground">
        You have view-only access to human reviews for this client. Approving reviews requires the
        “Approve Human Reviews” permission. The server enforces that permission on every decision.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {completed ? (
        <p className="text-[13px] text-muted-foreground">
          This review is complete and read-only.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={reviewStatusTone(review.status)}>{review.status}</StatusPill>
        {review.assigned_supervisor ? <StatusPill>by {review.assigned_supervisor}</StatusPill> : null}
      </div>
      {review.final_action ? (
        <p className="text-[13px] text-foreground">
          <span className="text-muted-foreground">Final action: </span>
          {review.final_action}
        </p>
      ) : null}
      {review.guidance ? (
        <p className="text-[12px] text-muted-foreground">Guidance: {review.guidance}</p>
      ) : null}
      {review.rejection_reason ? (
        <p className="text-[12px] text-muted-foreground">Rejection reason: {review.rejection_reason}</p>
      ) : null}
      {review.hold_until ? (
        <p className="text-[12px] text-muted-foreground">Held until: {review.hold_until}</p>
      ) : null}
    </div>
  );
}
