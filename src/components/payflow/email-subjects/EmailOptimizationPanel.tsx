import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../../api/client";
import {
  analyzeWorkflowEmails,
  decideEmailProposal,
  listEmailProposals,
  listLowPerformingEmails,
  scanLowPerformingEmails,
} from "../../../api/emailSubjects";
import { getPayflowWorkflow } from "../../../api/payflow";
import { usePayFlowAccess } from "../../../context/PayFlowAccessContext";
import { asRecord, formatRate, formatWhen } from "../../../lib/emailSubjectFormat";
import type { PayflowStrategy } from "../../../types";
import type { EmailLowPerformer, EmailProposal } from "../../../types/emailSubjects";
import { Btn, Field, Panel, StatusPill, TextArea, TextInput, type Tone } from "../lovable/payflow-ui";
import { MeasuredMetrics } from "./MeasuredMetrics";

function statusTone(status: string): Tone {
  if (status === "Accepted" || status === "Edited") return "success";
  if (status === "Pending") return "warning";
  if (status === "Rejected" || status === "Superseded") return "neutral";
  return "info";
}

export function EmailOptimizationPanel({
  strategy,
  stepId,
  canEdit,
  unsaved,
  onWorkflowUpdated,
}: {
  strategy: PayflowStrategy;
  stepId?: string | null;
  canEdit: boolean;
  unsaved: boolean;
  onWorkflowUpdated: (strategy: PayflowStrategy) => void;
}) {
  const { isOperationsAdmin } = usePayFlowAccess();
  const [items, setItems] = useState<EmailProposal[]>([]);
  const [pending, setPending] = useState(0);
  const [low, setLow] = useState<EmailLowPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | "analyze" | "scan" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [disclaimer, setDisclaimer] = useState("");

  const load = useCallback(async () => {
    const [proposals, performers] = await Promise.all([
      listEmailProposals({ strategy_id: strategy.id }),
      listLowPerformingEmails({ client_id: strategy.client_id }),
    ]);
    setItems(proposals.items || []);
    setPending(proposals.pending ?? 0);
    setLow(
      (performers.items || []).filter(
        (item) => item.strategy_id === strategy.id && (!stepId || item.step_id === stepId),
      ),
    );
  }, [strategy.id, strategy.client_id, stepId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    load()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Could not load email recommendations.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function analyze() {
    if (!canEdit || busyId || unsaved) return;
    if (
      !window.confirm(
        "Create a recommendation for each email step? The live workflow is not changed until you accept one.",
      )
    ) {
      return;
    }
    setBusyId("analyze");
    setError("");
    setNotice("");
    try {
      const created = await analyzeWorkflowEmails(strategy.id);
      setDisclaimer(created.disclaimer || "");
      await load();
      setNotice(`Recommendations are ready for ${created.strategy_name}. Review them before anything goes live.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not analyze this workflow's emails.");
    } finally {
      setBusyId(null);
    }
  }

  async function scan() {
    if (!isOperationsAdmin || busyId) return;
    if (
      !window.confirm(
        "Run the performance check for every active workflow now? Under-performing steps get a proposal. Live templates stay as they are.",
      )
    ) {
      return;
    }
    setBusyId("scan");
    setError("");
    try {
      const result = await scanLowPerformingEmails();
      await load();
      setNotice(`Checked ${result.workflows} workflows and stored ${result.proposals} proposals.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "The performance check could not be run.");
    } finally {
      setBusyId(null);
    }
  }

  async function decide(
    proposal: EmailProposal,
    action: "accept" | "edit" | "reject",
    draft?: { subject: string; body: string; note: string },
  ) {
    if (!canEdit || busyId || unsaved) return;
    const warning =
      action === "reject"
        ? "Reject this recommendation? The workflow text stays as it is."
        : "Save this text on the workflow? An Active or Approved workflow returns to Under Review and must be approved and activated again. The current live version is not replaced automatically.";
    if (!window.confirm(warning)) return;
    setBusyId(proposal.id);
    setError("");
    setNotice("");
    try {
      const updated = await decideEmailProposal(proposal.id, {
        action,
        subject: action === "edit" ? draft?.subject : undefined,
        body: action === "edit" ? draft?.body : undefined,
        note: draft?.note.trim() || undefined,
      });
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (action !== "reject") {
        const refreshed = await getPayflowWorkflow(strategy.id);
        onWorkflowUpdated(refreshed);
      } else {
        setNotice("Recommendation rejected. The workflow was not changed.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not record that decision.");
    } finally {
      setBusyId(null);
    }
  }

  const visible = stepId ? items.filter((item) => item.step_id === stepId) : items;
  const rest = stepId ? items.filter((item) => item.step_id !== stepId) : [];

  return (
    <Panel
      title="Email template optimization"
      description="Compare the current email with a recommended version. Accepting saves a draft through the normal review workflow."
      action={
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Btn disabled={!!busyId || unsaved} onClick={() => void analyze()}>
              {busyId === "analyze" ? "Analyzing…" : "Recommend improvements"}
            </Btn>
          ) : null}
          {isOperationsAdmin ? (
            <Btn disabled={!!busyId} onClick={() => void scan()}>
              {busyId === "scan" ? "Checking…" : "Run check now"}
            </Btn>
          ) : null}
        </div>
      }
    >
      {unsaved ? (
        <p className="mb-3 text-[12.5px] text-warning-foreground">
          Apply unsaved step changes first. Recommendations update the saved workflow.
        </p>
      ) : null}
      {error ? <p className="mb-3 text-[12.5px] text-destructive">{error}</p> : null}
      {notice ? <p className="mb-3 text-[12.5px] text-foreground">{notice}</p> : null}
      {disclaimer ? <p className="mb-3 text-[11.5px] text-muted-foreground">{disclaimer}</p> : null}
      <p className="mb-3 text-[12px] text-muted-foreground">
        {pending} waiting for a decision on this workflow.
      </p>

      {low.length > 0 ? (
        <div className="mb-3 space-y-2">
          {low.map((item) => (
            <div
              key={`${item.step_id}-${item.subject}`}
              className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2"
            >
              <p className="text-[12.5px] font-semibold text-foreground">
                Low performance · {item.step_title || item.step_id} · {item.recommendation}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{item.reason}</p>
            </div>
          ))}
        </div>
      ) : null}

      {loading ? <p className="text-[12.5px] text-muted-foreground">Loading recommendations…</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">
          {stepId
            ? "No recommendation for the selected step yet."
            : "No recommendations yet. Run Recommend improvements to compare each email step."}
        </p>
      ) : null}

      <div className="space-y-3">
        {visible.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            busy={busyId === proposal.id}
            canEdit={canEdit && !unsaved && busyId == null}
            onDecide={(action, draft) => void decide(proposal, action, draft)}
          />
        ))}
      </div>

      {rest.length > 0 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          {rest.length} other step{rest.length === 1 ? "" : "s"} on this workflow also have recommendations.
          Select that step to review them.
        </p>
      ) : null}
    </Panel>
  );
}

function ProposalCard({
  proposal,
  busy,
  canEdit,
  onDecide,
}: {
  proposal: EmailProposal;
  busy: boolean;
  canEdit: boolean;
  onDecide: (
    action: "accept" | "edit" | "reject",
    draft: { subject: string; body: string; note: string },
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(proposal.proposed?.subject || "");
  const [editBody, setEditBody] = useState(proposal.proposed?.body || "");
  const [note, setNote] = useState("");
  const evidence = asRecord(proposal.evidence);
  const comparable = asRecord(evidence?.comparable_templates);
  const canAccept = !!proposal.proposed && proposal.status === "Pending";
  const draft = { subject: editSubject, body: editBody, note };

  return (
    <article className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-semibold text-foreground">{proposal.step_title || proposal.step_id}</p>
        <StatusPill tone={statusTone(proposal.status)}>{proposal.status}</StatusPill>
        <StatusPill tone="info">{proposal.recommendation}</StatusPill>
      </div>
      <p className="mt-1 text-[11.5px] text-muted-foreground">
        {[evidence?.reminder_stage, evidence?.purpose].filter((item) => typeof item === "string").join(" · ")}
        {proposal.created_by ? ` · ${proposal.created_by}` : ""}
        {proposal.created_at ? ` · ${formatWhen(proposal.created_at)}` : ""}
      </p>
      {proposal.explanation ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-foreground">{proposal.explanation}</p>
      ) : null}
      {comparable ? (
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          Comparable templates: open {formatRate(Number(comparable.open_rate))} · click{" "}
          {formatRate(Number(comparable.click_rate))} · conversion {formatRate(Number(comparable.conversion))}
          {comparable.subjects != null ? ` across ${String(comparable.subjects)} subjects` : ""}.
        </p>
      ) : null}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <CopyBlock title="Current" text={proposal.existing} />
        <CopyBlock
          title="Recommended"
          text={proposal.proposed}
          empty="Nothing to apply for this recommendation."
        />
      </div>
      {proposal.alternative_subjects?.length ? (
        <ul className="mt-2 space-y-1">
          {proposal.alternative_subjects.map((item) => (
            <li key={item.subject || item.metrics?.conversion} className="text-[12px] text-muted-foreground">
              Alternative: {item.subject || "Untitled"}
              {item.metrics?.conversion != null ? ` · ${formatRate(item.metrics.conversion)} conversion` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {proposal.final?.subject || proposal.final?.body ? (
        <div className="mt-2">
          <CopyBlock title="Saved on the workflow" text={proposal.final} />
        </div>
      ) : null}
      {proposal.result?.status ? (
        <div className="mt-2">
          <p className="text-[12px] font-medium text-foreground">After activation: {proposal.result.status}</p>
          {proposal.result.metrics ? <MeasuredMetrics metrics={proposal.result.metrics} compact /> : null}
        </div>
      ) : null}
      {proposal.decision_note ? (
        <p className="mt-2 text-[12px] text-muted-foreground">Note: {proposal.decision_note}</p>
      ) : null}
      {proposal.decided_by ? (
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          {proposal.status} by {proposal.decided_by}
          {proposal.decided_at ? ` · ${formatWhen(proposal.decided_at)}` : ""}
        </p>
      ) : null}

      {canEdit && proposal.status === "Pending" ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <Field label="Decision note" hint="Optional. Stored with the decision.">
            <TextArea value={note} onChange={setNote} placeholder="Why this version should be used" />
          </Field>
          {editing ? (
            <div className="mt-2 space-y-2">
              <Field label="Subject">
                <TextInput value={editSubject} onChange={setEditSubject} />
              </Field>
              <Field label="Body">
                <TextArea value={editBody} onChange={setEditBody} />
              </Field>
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn variant="primary" disabled={!canAccept || busy} onClick={() => onDecide("accept", draft)}>
              {busy ? "Saving…" : "Accept"}
            </Btn>
            {editing ? (
              <>
                <Btn
                  variant="primary"
                  disabled={busy || !editSubject.trim()}
                  onClick={() => onDecide("edit", draft)}
                >
                  Save edited version
                </Btn>
                <Btn disabled={busy} onClick={() => setEditing(false)}>
                  Cancel edit
                </Btn>
              </>
            ) : (
              <Btn disabled={!canAccept || busy} onClick={() => setEditing(true)}>
                Edit
              </Btn>
            )}
            <Btn variant="danger" disabled={busy} onClick={() => onDecide("reject", draft)}>
              Reject
            </Btn>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Accept and edit do not activate the workflow. An approved or active workflow goes back to Under Review.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function CopyBlock({
  title,
  text,
  empty,
}: {
  title: string;
  text?: { subject?: string | null; body?: string | null; origin?: string | null } | null;
  empty?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        {text?.origin ? ` · ${text.origin}` : ""}
      </p>
      {text?.subject || text?.body ? (
        <>
          <p className="mt-1 text-[12.5px] font-medium text-foreground">{text.subject || "(no subject)"}</p>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-muted-foreground">
            {text.body || "(no body)"}
          </pre>
        </>
      ) : (
        <p className="mt-1 text-[12px] text-muted-foreground">{empty || "No text."}</p>
      )}
    </div>
  );
}
