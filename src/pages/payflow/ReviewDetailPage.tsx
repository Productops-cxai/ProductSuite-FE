import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  approvePayflowReview,
  getPayflowReview,
  holdPayflowReview,
  modifyPayflowReview,
  rejectPayflowReview,
} from "../../api/payflow";
import {
  Btn,
  Field,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextArea,
  TextInput,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
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

export function PayFlowReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const [review, setReview] = useState<PayflowReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<DecisionMode>(null);
  const [note, setNote] = useState("");
  const [action, setAction] = useState(PROPOSED_ACTIONS[0]);
  const [guidance, setGuidance] = useState("");
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [rejectComment, setRejectComment] = useState("");
  const [holdUntil, setHoldUntil] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);

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
        if (!cancelled) {
          setReview(res);
          if (res.proposed_action) setAction(res.proposed_action);
        }
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

  async function submitDecision(e: FormEvent) {
    e.preventDefault();
    if (!review || !mode) return;
    setBusy(true);
    setError("");
    try {
      let updated: PayflowReview;
      if (mode === "approve") {
        updated = await approvePayflowReview(review.id, { note: note || undefined });
      } else if (mode === "modify") {
        updated = await modifyPayflowReview(review.id, {
          action,
          guidance: guidance || undefined,
        });
      } else if (mode === "reject") {
        updated = await rejectPayflowReview(review.id, {
          reason: rejectReason,
          comment: rejectComment || undefined,
        });
      } else {
        updated = await holdPayflowReview(review.id, {
          until: holdUntil || undefined,
          reason: holdReason || undefined,
        });
      }
      setReview(updated);
      setMode(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading review…</p>;
  if (error && !review) {
    return (
      <Panel title="Review not available">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link to="/payflow/review" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to queue
        </Link>
      </Panel>
    );
  }
  if (!review) return null;

  const awaiting = review.status === "Awaiting Review";
  const canDecide = !!review.can_decide;
  const canModify = !!review.can_modify;

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Human Review", to: "/payflow/review" },
          { label: `${review.client_name} · ${review.customer_name}` },
        ]}
        title="Human Review"
        description={`${review.client_name} · ${review.customer_name} · ${review.account_reference}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={priorityTone(review.priority)}>{review.priority} Priority</StatusPill>
            <StatusPill tone={reviewStatusTone(review.status)}>{review.status}</StatusPill>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 text-[13px]">
        <div>
          <p className="text-eyebrow">Outstanding Balance</p>
          <p className="font-semibold tabular">{formatCurrency(review.outstanding_balance)}</p>
        </div>
        <div>
          <p className="text-eyebrow">Current Workflow</p>
          <p className="font-semibold">{review.current_workflow || "—"}</p>
        </div>
        <div>
          <p className="text-eyebrow">Review Created</p>
          <p className="font-semibold">
            {review.waiting_label || `${review.waiting_minutes} min`} ago
          </p>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <p className="text-[13px] font-semibold text-foreground">Why this requires review</p>
            <dl className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Triggered Rule</dt>
                <dd className="font-medium">
                  {review.rule_id ? (
                    <Link to={`/payflow/rules/${review.rule_id}`} className="text-primary hover:underline">
                      {review.rule_name}
                    </Link>
                  ) : (
                    review.rule_name || "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Condition</dt>
                <dd className="text-right font-medium">{review.condition_text || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Observed Value</dt>
                <dd className="text-right font-medium">{review.observed_value || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Result</dt>
                <dd className="font-medium">Require Human Review</dd>
              </div>
            </dl>
          </div>

          <Panel
            title="PayFlow Recommendation"
            action={
              review.confidence != null ? (
                <StatusPill tone="info">{Math.round(review.confidence)}% confidence</StatusPill>
              ) : undefined
            }
          >
            <p className="text-[14px] font-semibold text-foreground">{review.proposed_action}</p>
            <button
              type="button"
              className="mt-2 text-[13px] font-medium text-primary hover:underline"
              onClick={() => setShowExplanation((v) => !v)}
            >
              {showExplanation ? "Hide explanation" : "Why this action?"}
            </button>
            {showExplanation ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
                {(review.explanation || []).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <Panel title="Recent Activity">
            <ul className="space-y-2">
              {(review.timeline || []).map((event, i) => (
                <li key={`${event.at}-${i}`} className="flex justify-between gap-3 text-[13px]">
                  <span className="text-foreground">{event.label}</span>
                  <span className="shrink-0 text-muted-foreground">{event.at}</span>
                </li>
              ))}
            </ul>
            <Link
              to={`/payflow/cases/${review.account_id}`}
              className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline"
            >
              View Full History
            </Link>
          </Panel>

          <Panel title="Decision">
            {!awaiting ? (
              <div className="space-y-2 text-[13px]">
                <p>
                  <span className="text-muted-foreground">Status · </span>
                  <strong>{review.status}</strong>
                </p>
                {review.final_action ? (
                  <p>
                    <span className="text-muted-foreground">Final action · </span>
                    {review.final_action}
                  </p>
                ) : null}
                {review.guidance ? (
                  <p>
                    <span className="text-muted-foreground">Guidance · </span>
                    {review.guidance}
                  </p>
                ) : null}
                {review.rejection_reason ? (
                  <p>
                    <span className="text-muted-foreground">Rejection · </span>
                    {review.rejection_reason}
                  </p>
                ) : null}
                {review.hold_until ? (
                  <p>
                    <span className="text-muted-foreground">Hold until · </span>
                    {review.hold_until}
                  </p>
                ) : null}
              </div>
            ) : !canDecide ? (
              <p className="text-[13px] text-muted-foreground">
                Decision actions require the <strong>Approve Human Reviews</strong> permission.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Btn variant="primary" onClick={() => setMode("approve")}>
                    Approve
                  </Btn>
                  {canModify ? (
                    <Btn onClick={() => setMode("modify")}>Modify / Guide</Btn>
                  ) : (
                    <p className="self-center text-[12px] text-muted-foreground">
                      Modify requires Modify / Guide AI Recommendation.
                    </p>
                  )}
                  <Btn variant="danger" onClick={() => setMode("reject")}>
                    Reject
                  </Btn>
                  <Btn variant="ghost" onClick={() => setMode("hold")}>
                    Hold
                  </Btn>
                </div>

                {mode ? (
                  <form className="mt-4 space-y-3 border-t border-border pt-4" onSubmit={submitDecision}>
                    {mode === "approve" ? (
                      <Field label="Note (optional)">
                        <TextArea value={note} onChange={setNote} rows={3} />
                      </Field>
                    ) : null}
                    {mode === "modify" ? (
                      <>
                        <Field label="Final action">
                          <SelectInput
                            value={action}
                            onChange={setAction}
                            options={PROPOSED_ACTIONS}
                          />
                        </Field>
                        <Field label="Guidance (optional)">
                          <TextArea value={guidance} onChange={setGuidance} rows={3} />
                        </Field>
                      </>
                    ) : null}
                    {mode === "reject" ? (
                      <>
                        <Field label="Reason">
                          <SelectInput
                            value={rejectReason}
                            onChange={setRejectReason}
                            options={REJECTION_REASONS}
                          />
                        </Field>
                        <Field label="Comment (optional)">
                          <TextArea value={rejectComment} onChange={setRejectComment} rows={3} />
                        </Field>
                      </>
                    ) : null}
                    {mode === "hold" ? (
                      <>
                        <Field label="Hold until">
                          <TextInput
                            value={holdUntil}
                            onChange={setHoldUntil}
                            placeholder="e.g. 14 Sep 2026 or Further review"
                          />
                        </Field>
                        <Field label="Reason (optional)">
                          <TextArea value={holdReason} onChange={setHoldReason} rows={3} />
                        </Field>
                      </>
                    ) : null}
                    <div className="flex gap-2">
                      <Btn variant="primary" disabled={busy}>
                        {busy ? "Saving…" : "Confirm"}
                      </Btn>
                      <Btn variant="ghost" onClick={() => setMode(null)} disabled={busy}>
                        Cancel
                      </Btn>
                    </div>
                  </form>
                ) : null}
              </>
            )}
          </Panel>

          <Panel title="Review History">
            <ul className="space-y-3">
              {(review.history || []).map((h, i) => (
                <li key={`${h.at}-${i}`} className="border-b border-border pb-3 last:border-0">
                  <p className="text-[13px] font-medium text-foreground">{h.event}</p>
                  {h.detail ? <p className="text-[12px] text-muted-foreground">{h.detail}</p> : null}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {h.at}
                    {h.by ? ` · ${h.by}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Customer & Account">
            <dl className="divide-y divide-border text-[13px]">
              {[
                ["Client", review.client_name],
                ["Customer", review.customer_name],
                ["Account", review.account_reference],
                ["Original Balance", formatCurrency(review.original_balance)],
                ["Outstanding", formatCurrency(review.outstanding_balance)],
                ["Recovered", formatCurrency(review.recovered_balance)],
                ["Days Past Due", String(review.days_past_due)],
                ["Workflow", review.current_workflow || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-2.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
              {(review.context || []).map((c) => (
                <div key={c.label} className="flex justify-between gap-3 py-2.5">
                  <dt className="text-muted-foreground">{c.label}</dt>
                  <dd className="font-medium">{c.value}</dd>
                </div>
              ))}
            </dl>
            <Link
              to={`/payflow/cases/${review.account_id}`}
              className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline"
            >
              View Full Collection Case
            </Link>
          </Panel>

          <Panel title="Governance">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Rule</dt>
                <dd>
                  {review.rule_id ? (
                    <Link to={`/payflow/rules/${review.rule_id}`} className="text-primary hover:underline">
                      {review.rule_name}
                    </Link>
                  ) : (
                    review.rule_name || "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Requirement</dt>
                <dd className="font-medium">Require Human Review</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Client Scope</dt>
                <dd>
                  <Link to={`/payflow/clients/${review.client_id}`} className="text-primary hover:underline">
                    {review.client_name}
                  </Link>
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Review Metadata">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Review ID</dt>
                <dd className="font-medium">{review.code}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Assigned Supervisor</dt>
                <dd className="font-medium">{review.assigned_supervisor || "Unassigned"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Waiting</dt>
                <dd className="font-medium">{review.waiting_label || `${review.waiting_minutes} min`}</dd>
              </div>
              {review.hold_until ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Hold Until</dt>
                  <dd className="font-medium">{review.hold_until}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
