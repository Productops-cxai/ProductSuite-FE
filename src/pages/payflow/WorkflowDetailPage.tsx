import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  activatePayflowWorkflow,
  approvePayflowWorkflow,
  deactivatePayflowWorkflow,
  deletePayflowWorkflow,
  getPayflowWorkflow,
  listPayflowWorkflows,
  regeneratePayflowWorkflow,
  rejectPayflowWorkflow,
  savePayflowWorkflowDraft,
  submitPayflowWorkflowReview,
  updatePayflowWorkflow,
  writePayflowWorkflowMessages,
} from "../../api/payflow";
import { AdaptiveFollowups } from "../../components/payflow/AdaptiveFollowups";
import { StrategyCanvas } from "../../components/payflow/strategy-canvas";
import { EmailOptimizationPanel } from "../../components/payflow/email-subjects/EmailOptimizationPanel";
import {
  StepConfigForm,
  StepEditorDialog,
} from "../../components/payflow/strategy-step-editor";
import { WorkflowActionNoteModal } from "../../components/payflow/WorkflowActionNoteModal";
import {
  Btn,
  Field,
  PageHeader,
  Panel,
  StatusPill,
  TextArea,
} from "../../components/payflow/lovable/payflow-ui";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { SHOW_PAYFLOW_DELETE } from "../../lib/payflow-features";
import { sameConfig } from "../../lib/message-versions";
import {
  addStepAfter,
  canWriteWorkflowMessages,
  communicationSnippet,
  EDIT_DEMOTES_WARNING,
  editDemotesWorkflow,
  ensureStepLinks,
  messagesNotWrittenContext,
  isRejectedWorkflowStatus,
  originTone,
  rejectionAudit,
  removeStep,
  stepChannelFor,
  strategyStatusTone,
  toStepPayload,
  workflowVersionMention,
  type AddableStepKind,
} from "../../lib/strategy-workflow";
import type {
  PayflowStrategy,
  PayflowStrategyCatalog,
  PayflowStrategyStep,
  PayflowStrategyStepConfig,
  PayflowTextWarning,
} from "../../types";

type NoteAction = "update" | "approve" | "activate" | "reject";

const REGENERATION_NOTICE =
  "Regeneration requested. PayFlow will propose a revised strategy.";

function noticeFromLocation(state: unknown): string {
  if (!state || typeof state !== "object" || !("notice" in state)) return "";
  const notice = (state as { notice?: unknown }).notice;
  return typeof notice === "string" ? notice : "";
}

function positiveWorkflowId(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Turns #id mentions of a related workflow into links. Other text is left unchanged. */
function LinkedWorkflowText({
  text,
  workflowIds,
}: {
  text?: string | null;
  workflowIds: number[];
}) {
  if (!text) return null;
  const allowed = new Set(workflowIds);
  if (allowed.size === 0) return <>{text}</>;
  const parts = text.split(/(#\d+)/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = /^#(\d+)$/.exec(part);
        if (!match) return <span key={index}>{part}</span>;
        const id = Number(match[1]);
        if (!allowed.has(id)) return <span key={index}>{part}</span>;
        return (
          <Link
            key={index}
            to={`/payflow/workflows/${id}`}
            className="font-medium text-primary hover:underline"
          >
            {part}
          </Link>
        );
      })}
    </>
  );
}

function findStep(strategy: PayflowStrategy, id: string | null): PayflowStrategyStep | null {
  if (!id) return null;
  return (strategy.steps || []).find((s, i) => (s.id || `s${i + 1}`) === id) || null;
}

/** Lovable: human-created is origin only (not source). */
function isHumanCreatedWorkflow(row: PayflowStrategy) {
  return row.origin === "Human Created";
}

/** AI / Human Modified / Human Created workflows regenerate on reject with remarks. */
/** Statuses the API regenerates directly (REGENERATE_STATUSES in workflow_suggestion/service.py). */
const REGENERATES_AS_IS = new Set(["Draft", "AI Proposed", "Under Review", "Approved"]);

function regeneratesOnReject(row: PayflowStrategy) {
  return (
    row.source === "AI Generated" ||
    row.source === "Human Created" ||
    row.origin === "AI Proposed" ||
    row.origin === "Human Modified" ||
    row.origin === "Human Created"
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" />
    </svg>
  );
}

export function PayFlowWorkflowDetailPage() {
  const { strategyId } = useParams<{ strategyId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const flashNotice = noticeFromLocation(location.state);
  const { hasPermission } = usePayFlowAccess();
  const canDelete = SHOW_PAYFLOW_DELETE && hasPermission("delete_workflows");
  const canEdit = hasPermission("create_edit_workflows");
  const [strategy, setStrategy] = useState<PayflowStrategy | null>(null);
  const [catalog, setCatalog] = useState<PayflowStrategyCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftStep, setDraftStep] = useState<PayflowStrategyStep | null>(null);
  const [pendingSteps, setPendingSteps] = useState<PayflowStrategyStep[] | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showAiSnapshot, setShowAiSnapshot] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [noteAction, setNoteAction] = useState<NoteAction | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [segmentDraft, setSegmentDraft] = useState<Record<string, string>>({});
  const [segmentDirty, setSegmentDirty] = useState(false);
  const [writingMessages, setWritingMessages] = useState(false);
  const [textWarnings, setTextWarnings] = useState<PayflowTextWarning[]>([]);

  async function load() {
    const id = Number(strategyId);
    if (!Number.isFinite(id)) {
      setError("Workflow not found");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [row, listRes] = await Promise.all([
        getPayflowWorkflow(id),
        listPayflowWorkflows({}).catch(() => null),
      ]);
      const linked = ensureStepLinks(row);
      setStrategy(linked);
      setSegmentDraft({ ...(linked.segment || {}) });
      setSegmentDirty(false);
      if (listRes?.catalog) setCatalog(listRes.catalog);
      // Lovable: start with no step selected so Approval & versions / empty config show.
      setSelectedId(null);
      setDraftStep(null);
      setPendingSteps(null);
      setTextWarnings([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load workflow");
      setStrategy(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setNotice(flashNotice);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId, flashNotice]);

  const displayStrategy = useMemo(() => {
    if (!strategy) return null;
    if (!pendingSteps) return strategy;
    return ensureStepLinks({ ...strategy, steps: pendingSteps });
  }, [strategy, pendingSteps]);

  function selectStep(id: string) {
    if (!displayStrategy) return;
    const step = findStep(displayStrategy, id);
    if (!step) return;
    setSelectedId(id);
    setDraftStep({ ...step, id, config: { ...(step.config || {}) } });
  }

  function workingSteps(): PayflowStrategyStep[] {
    return pendingSteps || displayStrategy?.steps || strategy?.steps || [];
  }

  function applyLocalSteps(next: PayflowStrategyStep[], focusId?: string | null) {
    const linked = ensureStepLinks({
      ...(strategy as PayflowStrategy),
      steps: next,
    });
    setPendingSteps(linked.steps);
    const id = focusId || selectedId;
    if (id) {
      const step = findStep(linked, id);
      if (step) {
        setSelectedId(id);
        setDraftStep({ ...step, id, config: { ...(step.config || {}) } });
      }
    }
  }

  function patchDraft(
    patch: Partial<PayflowStrategyStepConfig> & { title?: string },
  ) {
    if (!draftStep || !strategy) return;
    const { title, ...cfgPatch } = patch;
    const nextCfg = { ...(draftStep.config || {}), ...cfgPatch };
    const updated: PayflowStrategyStep = {
      ...draftStep,
      title: title !== undefined ? title : draftStep.title,
      config: nextCfg,
      channel: stepChannelFor(draftStep.kind, nextCfg, draftStep.channel),
      purpose: nextCfg.purpose ?? draftStep.purpose,
      origin: "Human Modified",
    };
    const steps = workingSteps().map((s, i) => {
      const id = s.id || `s${i + 1}`;
      return id === updated.id ? { ...updated, id } : s;
    });
    const serverSteps = strategy.steps || [];
    const backToSaved =
      steps.length === serverSteps.length &&
      steps.every((step) => {
        const saved = serverSteps.find((item, index) => (item.id || `s${index + 1}`) === step.id);
        if (!saved) return false;
        return (
          step.title === saved.title &&
          !!step.disabled === !!saved.disabled &&
          sameConfig(step.config || {}, saved.config || {})
        );
      });
    if (backToSaved) {
      setPendingSteps(null);
      const saved = findStep(strategy, updated.id || "");
      if (saved) setDraftStep({ ...saved, id: updated.id, config: { ...(saved.config || {}) } });
      return;
    }
    applyLocalSteps(steps, updated.id);
  }

  /** True when the reviewer changed steps or the segment and has not saved yet. */
  function hasUnsavedEdits() {
    return !!pendingSteps || segmentDirty;
  }

  /**
   * Approve / Activate / Submit act on what is saved on the server. Running them
   * with unsaved edits silently threw the edits away, so they are refused instead.
   */
  function refuseWithUnsavedEdits(actionLabel: string) {
    if (!hasUnsavedEdits()) return false;
    setNotice("");
    setError(
      `You have unsaved changes. Save them first (Save Draft), then ${actionLabel} — otherwise the saved version would be used and your changes lost.`,
    );
    setNoteAction(null);
    return true;
  }

  async function persistSteps(
    note?: string,
    extraPatch?: Partial<PayflowStrategyStepConfig>,
  ): Promise<boolean> {
    if (!strategy) return false;
    if (editDemotesWorkflow(strategy.status) && !window.confirm(EDIT_DEMOTES_WARNING)) {
      setNoteAction(null);
      return false;
    }
    setBusy(true);
    setError("");
    try {
      const steps = workingSteps().map((s, i) => {
        const id = s.id || `s${i + 1}`;
        if (!draftStep || id !== draftStep.id) {
          return { ...s, id };
        }
        const cfg = { ...(draftStep.config || {}), ...(extraPatch || {}) };
        return {
          ...draftStep,
          id,
          config: cfg,
          channel: stepChannelFor(draftStep.kind, cfg, draftStep.channel),
          purpose: cfg.purpose ?? draftStep.purpose,
          origin: "Human Modified",
        };
      });
      if (extraPatch && draftStep?.id) applyLocalSteps(steps, draftStep.id);
      const updated = ensureStepLinks(
        await updatePayflowWorkflow(strategy.id, {
          steps: toStepPayload(steps),
          entry_node_id: strategy.entry_node_id || undefined,
          segment: segmentDirty ? segmentDraft : undefined,
          note: note || undefined,
        }),
      );
      const warnings = updated.text_warnings || [];
      setTextWarnings(warnings);
      setStrategy(updated);
      setSegmentDraft({ ...(updated.segment || {}) });
      setSegmentDirty(false);
      setPendingSteps(null);
      setNotice(
        warnings.length
          ? `Saved. ${warnings.length} message note${warnings.length === 1 ? "" : "s"} — the text was still saved.`
          : strategy.status === "Approved" || strategy.status === "Active"
            ? "Prior approved configuration archived. Changes recorded as Human Modified — not activated."
            : "Change recorded as Human Modified. Workflow is not activated by editing.",
      );
      if (draftStep?.id) {
        const refreshed = findStep(updated, draftStep.id);
        if (refreshed) setDraftStep({ ...refreshed, id: draftStep.id });
      }
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update workflow");
      return false;
    } finally {
      setBusy(false);
      setNoteAction(null);
    }
  }

  async function runAction(
    action: () => Promise<PayflowStrategy>,
    success: string | ((row: PayflowStrategy) => string),
  ) {
    if (!strategy) return;
    setBusy(true);
    setError("");
    try {
      const updated = ensureStepLinks(await action());
      setStrategy(updated);
      setPendingSteps(null);
      setNotice(typeof success === "function" ? success(updated) : success);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Action failed");
    } finally {
      setBusy(false);
      setNoteAction(null);
    }
  }

  /** Reject / regenerate using the sidebar note (Lovable: panel note feeds this action). */
  async function runReject(note: string) {
    if (!strategy) return;
    const shouldRegen = regeneratesOnReject(strategy);
    if (shouldRegen && note.trim().length < 3) {
      setError("Remarks of at least 3 characters are required to regenerate.");
      setNoteAction(null);
      return;
    }
    // Rejecting a workflow that is in use stops collections for its accounts.
    if (
      strategy.status === "Active" &&
      !window.confirm(
        "This workflow is Active. Rejecting it stops collection activity for every account currently on it.\n\nReject it?",
      )
    ) {
      setNoteAction(null);
      return;
    }
    setBusy(true);
    setError("");
    // The AI can fail (it is a long call). Wherever the server regenerates a workflow
    // as it stands (Draft, AI Proposed, Under Review, Approved), ask for the new version
    // FIRST: a failure then leaves the original untouched, and an Approved workflow does
    // not lose its approval for nothing. Active / Inactive must be rejected first: the
    // server refuses to regenerate them, and rejecting an Active one stops its runs.
    const regenerateFirst = shouldRegen && REGENERATES_AS_IS.has(strategy.status);
    let rejected = false;
    try {
      if (regenerateFirst) {
        const regenerated = ensureStepLinks(
          await regeneratePayflowWorkflow(strategy.id, { remarks: note.trim() }),
        );
        try {
          await rejectPayflowWorkflow(strategy.id, { note: note || undefined });
        } catch {
          // The new version exists; the original simply stays open for the reviewer.
        }
        setRejectNote("");
        navigate(`/payflow/workflows/${regenerated.id}`, {
          state: { notice: REGENERATION_NOTICE },
        });
        return;
      }
      await rejectPayflowWorkflow(strategy.id, { note: note || undefined });
      rejected = true;
      setRejectNote("");
      if (shouldRegen) {
        const regenerated = ensureStepLinks(
          await regeneratePayflowWorkflow(strategy.id, { remarks: note.trim() }),
        );
        navigate(`/payflow/workflows/${regenerated.id}`, {
          state: { notice: REGENERATION_NOTICE },
        });
        return;
      }
      const refreshed = ensureStepLinks(await getPayflowWorkflow(strategy.id));
      setStrategy(refreshed);
      setPendingSteps(null);
      setNotice("Returned for changes. Status reset; history is retained.");
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Reject / regenerate failed";
      if (rejected) {
        // Rejected, but no new version: show the page as it really is now.
        try {
          setStrategy(ensureStepLinks(await getPayflowWorkflow(strategy.id)));
          setPendingSteps(null);
        } catch {
          /* keep what is on screen */
        }
        setNotice("");
        setError(
          `The workflow was rejected, but the AI could not produce a new version: ${detail} Use Reject / Regenerate again to retry.`,
        );
      } else {
        setError(
          regenerateFirst
            ? `The AI could not produce a new version, so nothing was changed: ${detail}`
            : detail,
        );
      }
    } finally {
      setBusy(false);
      setNoteAction(null);
    }
  }

  /**
   * AI writes message text on the server. Block when local step edits are unsaved
   * so we do not discard pending graph changes by refreshing from the response.
   */
  async function writeMessages(opts?: {
    step_id?: string;
    remarks?: string;
    audience?: string;
  }): Promise<boolean> {
    if (!strategy) return false;
    if (pendingSteps) {
      setError(
        "Save this version first, then regenerate. Regenerating uses the saved workflow on the server.",
      );
      setNoteAction(null);
      return false;
    }
    setWritingMessages(true);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = ensureStepLinks(
        await writePayflowWorkflowMessages(strategy.id, {
          step_id: opts?.step_id,
          remarks: opts?.remarks,
          ...(opts?.audience ? { audience: opts.audience } : {}),
        }),
      );
      setStrategy(updated);
      setPendingSteps(null);
      setTextWarnings([]);
      setSegmentDraft({ ...(updated.segment || {}) });
      setSegmentDirty(false);
      if (selectedId) {
        const refreshed = findStep(updated, selectedId);
        if (refreshed) {
          setDraftStep({ ...refreshed, id: selectedId, config: { ...(refreshed.config || {}) } });
        }
      }
      setNotice(
        opts?.audience
          ? "This text was rewritten. Other versions and steps were left as they are."
          : opts?.step_id
            ? "This step was rewritten, including the main text and every version."
            : "Message text written by AI for all email / SMS steps.",
      );
      return true;
    } catch (err) {
      setNotice("");
      setError(err instanceof ApiError ? err.detail : "Failed to write messages");
      return false;
    } finally {
      setWritingMessages(false);
      setBusy(false);
      setNoteAction(null);
    }
  }

  async function onNoteConfirm(note: string) {
    if (!strategy || !noteAction) return;
    if (noteAction === "update") {
      await persistSteps(note);
      return;
    }
    if (noteAction === "approve") {
      if (refuseWithUnsavedEdits("approve")) return;
      await runAction(
        () => approvePayflowWorkflow(strategy.id, { note: note || undefined }),
        (row) =>
          `Strategy approved${row.approved_by ? ` by ${row.approved_by}` : ""}. Activate it when ready for collection execution.`,
      );
      return;
    }
    if (noteAction === "activate") {
      if (refuseWithUnsavedEdits("activate")) return;
      await runAction(
        () => activatePayflowWorkflow(strategy.id, { note: note || undefined }),
        "Workflow is now Active for collection execution.",
      );
      return;
    }
    if (noteAction === "reject") {
      await runReject(note);
    }
  }

  async function onDelete() {
    if (!strategy) return;
    setBusy(true);
    try {
      await deletePayflowWorkflow(strategy.id);
      navigate("/payflow/workflows");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Delete failed");
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading workflow…</p>;
  if (error && !strategy) {
    return (
      <Panel title="Workflow not available">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link
          to="/payflow/workflows"
          className="mt-3 inline-block text-[13px] font-medium text-primary"
        >
          Back to workflows
        </Link>
      </Panel>
    );
  }
  if (!strategy || !displayStrategy) return null;

  const isAiProposed = strategy.status === "AI Proposed";
  const isDraft = strategy.status === "Draft";
  const isUnderReview = strategy.status === "Under Review";
  const isApproved = strategy.status === "Approved";
  const isActive = strategy.status === "Active";
  const isInactive = strategy.status === "Inactive";
  const isRejected = isRejectedWorkflowStatus(strategy.status);
  // Lovable: humanCreated = origin === "Human Created" (Human Modified still gets Reject + regen).
  const isHumanCreated = isHumanCreatedWorkflow(strategy);
  const isAiGenerated = regeneratesOnReject(strategy);
  const humanModifiedCount = (displayStrategy.steps || []).filter(
    (s) => s.origin === "Human Modified",
  ).length;
  const segmentLabelRows: { label: string; value: string }[] = (
    [
      ["age_band", "Age band"],
      ["postal_region", "Postal region"],
      ["balance_band", "Balance band"],
      ["delinquency", "Delinquency stage"],
      ["language", "Language"],
      ["tenure", "Customer tenure"],
    ] as const
  )
    .map(([key, label]) => ({
      label,
      value: String(strategy.segment?.[key] || segmentDraft[key] || ""),
    }))
    .filter((row) => !!row.value);
  const hasSegment = !!strategy.segment && Object.keys(strategy.segment).length > 0;
  const aiOriginalSteps: PayflowStrategyStep[] = Array.isArray(
    strategy.ai_proposal_snapshot?.steps,
  )
    ? (strategy.ai_proposal_snapshot?.steps as PayflowStrategyStep[])
    : [];
  // Lovable: step edits always available to reviewers (BE demotes Active → Under Review).
  // A rejected workflow is kept for audit and is read-only.
  const canMutateGraph = canEdit && !isRejected;
  // Lovable: Save Draft + Approve always for reviewers; Approve→Activate after approval (AC1).
  const canSaveDraft = canEdit && !isRejected;
  const showPrimaryAction = canEdit && !isActive && !isRejected;
  const primaryIsActivate = isApproved || (isInactive && !!strategy.approved_by);
  // Delete only for human-created (soft-gated). Reject / regen is available for all origins.
  const showDelete = canDelete && isHumanCreated && !isActive;
  const showReject = canEdit && !isRejected;
  const canDeactivate = canEdit && isActive;
  const canSubmitReview = canEdit && isDraft;
  // Lovable: AI banner only while origin is still "AI Proposed".
  const showAiBanner =
    strategy.origin === "AI Proposed" && strategy.status !== "Active" && !isRejected;
  // Request regeneration for AI Proposed, Human Modified, and Human Created.
  const showRequestRegen = canEdit && !isRejected;
  const replacedById = positiveWorkflowId(strategy.replaced_by_id);
  const revisionOfId = positiveWorkflowId(strategy.revision_of_id);
  const mentionNotes = [
    ...(strategy.versions || []).map((version) => version.note),
    ...(strategy.ai_context || []).map((item) => `${item.label} ${item.value}`),
  ];
  const linkedWorkflowIds = [replacedById, revisionOfId].filter((id): id is number => id != null);
  const rejection = isRejected ? rejectionAudit(strategy) : null;
  const approvalRows: [string, string][] = [["Origin", strategy.origin]];
  if (!isHumanCreated) {
    approvalRows.push(["Human modified steps", String(humanModifiedCount)]);
  }
  if (rejection) {
    approvalRows.push(["Rejected By", rejection.by], ["Rejected Date", rejection.date]);
  }
  if (!rejection || strategy.approved_by) {
    approvalRows.push(
      ["Approved By", strategy.approved_by || "Not yet approved"],
      ["Approval Date", strategy.approval_date || "—"],
    );
  }
  approvalRows.push(
    ["Strategy Version", `v${strategy.version}`],
    [
      "Cases covered",
      strategy.cases_covered != null
        ? strategy.cases_covered.toLocaleString()
        : strategy.coverage || "—",
    ],
  );
  const hasCommSteps = (displayStrategy.steps || []).some(
    (s) => s.kind === "Communication",
  );
  const allowWriteMessages =
    canEdit && canWriteWorkflowMessages(strategy.status) && hasCommSteps;
  const messagesGap = messagesNotWrittenContext(strategy.ai_context);
  const excluded =
    catalog?.excluded_targeting_attributes || [
      "Ethnicity",
      "Religion",
      "Gender",
      "Health status",
      "Marital status",
    ];

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Strategies / Workflows", to: "/payflow/workflows" },
          {
            label: strategy.client_name || "Client",
            to: `/payflow/clients/${strategy.client_id}`,
          },
          ...(strategy.portfolio_id && strategy.portfolio_name
            ? [
                {
                  label: strategy.portfolio_name,
                  to: `/payflow/clients/${strategy.client_id}/portfolios/${strategy.portfolio_id}`,
                },
              ]
            : []),
          { label: strategy.name },
        ]}
        title={strategy.name}
        description={strategy.summary || undefined}
        actions={
          <>
            <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
              <StatusPill tone={strategyStatusTone(strategy.status)} dot>
                {strategy.status}
              </StatusPill>
              <StatusPill>v{strategy.version}</StatusPill>
              {(strategy.human_modified || strategy.origin === "Human Modified") && (
                <StatusPill tone="info">Human Modified</StatusPill>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {canSubmitReview && (
                <Btn
                  disabled={busy}
                  onClick={() => {
                    if (refuseWithUnsavedEdits("submit for review")) return;
                    void runAction(
                      () => submitPayflowWorkflowReview(strategy.id),
                      "Submitted for review.",
                    );
                  }}
                >
                  Submit for review
                </Btn>
              )}
              {canSaveDraft && (
                <Btn
                  disabled={busy}
                  onClick={() => {
                    // With edits on screen, "Save Draft" must save them. It used to
                    // call the server without them and then drop them.
                    if (hasUnsavedEdits()) {
                      void persistSteps();
                      return;
                    }
                    if (editDemotesWorkflow(strategy.status)) {
                      setError("");
                      setNotice(
                        "Nothing to save. This workflow is approved for collections — it stays as it is until you change a step.",
                      );
                      return;
                    }
                    void runAction(() => savePayflowWorkflowDraft(strategy.id), "Draft saved.");
                  }}
                >
                  Save Draft
                </Btn>
              )}
              {showDelete && (
                <Btn variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                  Delete
                </Btn>
              )}
              {showReject && (
                <Btn
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    // Sidebar "Note for PayFlow" feeds Reject / regeneration.
                    if (isAiGenerated && rejectNote.trim().length >= 3) {
                      void runReject(rejectNote);
                      return;
                    }
                    setNoteAction("reject");
                  }}
                >
                  Reject / Regenerate
                </Btn>
              )}
              {showPrimaryAction && (
                <Btn
                  variant="primary"
                  disabled={busy}
                  onClick={() => {
                    // After approve → same primary button becomes Activate (AC1).
                    if (refuseWithUnsavedEdits(primaryIsActivate ? "activate" : "approve")) {
                      return;
                    }
                    if (primaryIsActivate) {
                      setNoteAction("activate");
                      return;
                    }
                    if (isAiProposed || isUnderReview) {
                      setNoteAction("approve");
                      return;
                    }
                    if (isDraft && isHumanCreated) {
                      void runAction(
                        () => submitPayflowWorkflowReview(strategy.id),
                        "Submitted for review.",
                      );
                      return;
                    }
                    setNotice(
                      "Approve is available once the workflow is AI Proposed or Under Review.",
                    );
                    setError("");
                  }}
                >
                  {primaryIsActivate ? "Activate" : "Approve Strategy"}
                </Btn>
              )}
              {canDeactivate && (
                <Btn
                  disabled={busy}
                  onClick={() =>
                    void runAction(
                      () => deactivatePayflowWorkflow(strategy.id),
                      "Workflow deactivated. History and prior executions are retained.",
                    )
                  }
                >
                  Deactivate
                </Btn>
              )}
            </div>
          </>
        }
      />

      {notice && (
        <div className="mb-4 rounded-lg border border-primary/25 bg-primary/[0.06] px-4 py-2.5 text-[12.5px] text-foreground">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-4 py-2.5 text-[12.5px] text-destructive">
          {error}
        </div>
      )}
      {pendingSteps && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/[0.08] px-4 py-2.5 text-[12.5px] text-foreground">
          You have unsaved step changes. Apply them with a note to persist — editing does not
          activate the workflow.
        </div>
      )}

      {isRejected && replacedById != null && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-4 py-2.5 text-[12.5px] text-foreground">
          Rejected – replaced by{" "}
          <Link
            to={`/payflow/workflows/${replacedById}`}
            className="font-semibold text-primary hover:underline"
          >
            {workflowVersionMention(replacedById, mentionNotes)}
          </Link>
        </div>
      )}

      {revisionOfId != null && (
        <div className="mb-4 rounded-lg border border-border/80 bg-card px-4 py-2.5 text-[12.5px] text-foreground">
          Revision of{" "}
          <Link
            to={`/payflow/workflows/${revisionOfId}`}
            className="font-semibold text-primary hover:underline"
          >
            {workflowVersionMention(revisionOfId, mentionNotes)}
          </Link>
        </div>
      )}

      {showAiBanner && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ai/25 bg-ai/[0.06] px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-7 items-center justify-center rounded-lg bg-ai/15 text-ai">
              <SparklesIcon className="size-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-foreground">AI Proposed Strategy</p>
              <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
                PayFlow generated this strategy using the available portfolio, account, payment and
                engagement context. Review each step, adjust what needs changing, then approve.
              </p>
            </div>
          </div>
          <Btn variant="ghost" onClick={() => setShowContext((v) => !v)}>
            {showContext ? "Hide reasoning" : "Why PayFlow proposed this strategy"}
          </Btn>
        </div>
      )}

      {messagesGap && allowWriteMessages && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/[0.08] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">Messages not written</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {messagesGap.value}
            </p>
          </div>
          <Btn
            variant="primary"
            disabled={busy || writingMessages}
            onClick={() => void writeMessages()}
          >
            {writingMessages ? "Writing…" : "Write messages"}
          </Btn>
        </div>
      )}

      {showContext && (
        <Panel
          title="Why PayFlow proposed this strategy"
          description="Operational context only. Strategy decisions never use demographic attributes."
          className="mb-4"
        >
          {(strategy.ai_context || []).length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              No additional reasoning context was recorded for this proposal.
            </p>
          ) : (
            <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {strategy.ai_context.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1 border-b border-border/50 pb-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <dt className="text-[12px] text-muted-foreground">
                    <LinkedWorkflowText text={item.label} workflowIds={linkedWorkflowIds} />
                  </dt>
                  <dd className="text-[12.5px] font-medium text-foreground sm:text-right">
                    <LinkedWorkflowText text={item.value} workflowIds={linkedWorkflowIds} />
                    {item.label === "Messages" &&
                    allowWriteMessages &&
                    /not written/i.test(item.value) ? (
                      <Btn
                        className="ml-2 align-middle"
                        disabled={busy || writingMessages}
                        onClick={() => void writeMessages()}
                      >
                        Write messages
                      </Btn>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>
      )}

      {hasSegment && (
        <Panel
          title="Who this strategy applies to"
          description="Operational and geographic attributes only. Protected attributes are never used for targeting."
          className="mb-4"
        >
          <div className="flex flex-wrap gap-1.5">
            {segmentLabelRows.length > 0 ? (
              segmentLabelRows.map((item) => (
                <span
                  key={item.label}
                  className="rounded-lg border border-border/70 bg-surface px-2.5 py-1.5 text-[11.5px]"
                >
                  <span className="text-muted-foreground">{item.label}: </span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </span>
              ))
            ) : (
              <p className="text-[12.5px] text-muted-foreground">No segment attributes set.</p>
            )}
          </div>
          <p className="mt-2.5 text-[11.5px] text-muted-foreground">
            Excluded from targeting: {excluded.join(", ")}.
          </p>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
        <Panel
          title="Strategy flow"
          description={
            isRejected
              ? "This workflow was rejected and is read-only. Click a step to review its configuration."
              : "Click a step to review it, or use the expand icon to edit it in a popup."
          }
          bodyClassName="min-w-0 p-3"
          className="min-w-0"
        >
          <StrategyCanvas
            strategy={displayStrategy}
            selectedId={selectedId}
            onSelect={selectStep}
            onExpand={(id) => {
              selectStep(id);
              setExpandOpen(true);
            }}
            templateSnippetFor={(node) =>
              communicationSnippet(node, catalog?.message_templates || [])
            }
          />
        </Panel>

        <div className="space-y-4">
          {!draftStep ? (
            <Panel title="Step configuration">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Select a step on the canvas to see its configuration. Timing, channels, templates and
                conditions use the values PayFlow allows for this client.
              </p>
            </Panel>
          ) : (
            <Panel
              title={draftStep.kind}
              description={draftStep.title}
              bodyClassName={
                draftStep.kind === "Communication"
                  ? "xl:max-h-[calc(100vh-7.5rem)] xl:overflow-y-auto"
                  : undefined
              }
              action={
                <Btn variant="ghost" onClick={() => setExpandOpen(true)}>
                  Expand
                </Btn>
              }
            >
              <StepConfigForm
                strategy={displayStrategy}
                step={draftStep}
                catalog={catalog}
                canEdit={!!canMutateGraph && !busy}
                canWriteMessages={allowWriteMessages}
                writingMessages={writingMessages}
                saving={busy}
                unsaved={!!pendingSteps || segmentDirty}
                savedConfig={
                  draftStep.id ? findStep(strategy, draftStep.id)?.config || null : null
                }
                textWarnings={textWarnings}
                onChange={patchDraft}
                onSaveVersion={(patch) =>
                  persistSteps(patch ? "Removed communication version" : "Saved communication version", patch)
                }
                onRewriteMessage={(remarks, audience) => {
                  if (!draftStep.id) return Promise.resolve(false);
                  return writeMessages({ step_id: draftStep.id, remarks, audience });
                }}
                onToggleDisabled={() => {
                  const flipped = {
                    ...draftStep,
                    disabled: !draftStep.disabled,
                    origin: "Human Modified" as const,
                  };
                  setDraftStep(flipped);
                  applyLocalSteps(
                    workingSteps().map((s) => (s.id === flipped.id ? flipped : s)),
                    flipped.id,
                  );
                }}
                onAddAfter={(kind: AddableStepKind) => {
                  if (!draftStep.id) return;
                  const next = addStepAfter(workingSteps(), draftStep.id, kind);
                  const created = next.find(
                    (s) => !workingSteps().some((o) => (o.id || "") === (s.id || "")),
                  );
                  applyLocalSteps(next, created?.id || draftStep.id);
                }}
                onRemove={() => {
                  if (!draftStep.id) return;
                  const next = removeStep(workingSteps(), draftStep.id);
                  applyLocalSteps(next, strategy.entry_node_id || next[0]?.id || null);
                }}
              />
              {canMutateGraph && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                  <Btn
                    variant="primary"
                    disabled={busy}
                    onClick={() => setNoteAction("update")}
                  >
                    Apply step changes
                  </Btn>
                  <Btn disabled={busy} onClick={() => setExpandOpen(true)}>
                    Expand editor
                  </Btn>
                </div>
              )}
            </Panel>
          )}

          <Panel
            title="Approval & versions"
            action={
              <Btn variant="ghost" onClick={() => setShowAudit((v) => !v)}>
                {showAudit ? "Hide" : "View changes"}
              </Btn>
            }
          >
            <dl className="space-y-1.5 text-[12.5px]">
              {approvalRows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">
                    {label === "Origin" ? (
                      <StatusPill tone={originTone(String(value))}>{value}</StatusPill>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {strategy.ai_proposal_snapshot && (
              <div className="mt-3 border-t border-border/60 pt-3">
                <Btn onClick={() => setShowAiSnapshot((v) => !v)}>
                  {showAiSnapshot ? "Hide original AI proposal" : "Original AI proposal"}
                </Btn>
                {showAiSnapshot && (
                  <div className="mt-2 space-y-2">
                    <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                      The steps as the AI first proposed them, kept unchanged for comparison
                      with the current workflow.
                    </p>
                    {aiOriginalSteps.length === 0 ? (
                      <p className="text-[11.5px] text-muted-foreground">
                        No steps were stored with the original proposal.
                      </p>
                    ) : (
                      <ol className="space-y-1.5">
                        {aiOriginalSteps.map((s, i) => (
                          <li
                            key={`${s.id || i}`}
                            className="rounded-lg border border-border/60 bg-surface px-3 py-2 text-[12px]"
                          >
                            <span className="font-medium text-foreground">
                              {i + 1}. {s.title || s.kind}
                            </span>
                            <span className="ml-2 text-muted-foreground">
                              {[s.kind, s.timing].filter(Boolean).join(" · ")}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            )}

            {showAudit && (
              <ul className="mt-3 space-y-3 border-t border-border/60 pt-3">
                {(strategy.versions || []).length === 0 ? (
                  <li className="text-[11.5px] text-muted-foreground">No version history yet.</li>
                ) : (
                  (strategy.versions || []).map((v, i) => (
                    <li
                      key={`${v.id || v.version}-${i}`}
                      className="rounded-lg border border-border/60 bg-surface px-3 py-2"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[12.5px] font-semibold text-foreground">
                          v{v.version}
                          {v.status ? (
                            <span
                              className={
                                // "Rejected" is a history-only status (written when a
                                // workflow is regenerated): make it stand out.
                                v.status === "Rejected"
                                  ? "ml-2 text-[11px] font-semibold text-destructive"
                                  : "ml-2 text-[11px] font-normal text-muted-foreground"
                              }
                            >
                              {v.status}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{v.date}</span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        <LinkedWorkflowText text={v.note} workflowIds={linkedWorkflowIds} />
                      </p>
                      {v.reviewer_note && (
                        <p className="mt-1 text-[11.5px] text-foreground">
                          <span className="font-semibold">Reviewer note: </span>
                          {v.reviewer_note}
                        </p>
                      )}
                      {v.origin && (
                        <p className="mt-1 text-[11px] text-muted-foreground">Origin: {v.origin}</p>
                      )}
                      {(v.changes || []).length > 0 && (
                        <ul className="mt-1.5 list-inside list-disc text-[11px] text-muted-foreground">
                          {v.changes!.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </Panel>

          {showRequestRegen && (
            <Panel title="Request regeneration">
              <Field
                label="Note for PayFlow"
                hint="Optional. Explain what should change, then use Reject / Request Regeneration."
              >
                <TextArea
                  value={rejectNote}
                  onChange={setRejectNote}
                  placeholder="e.g. reduce contact volume for low balances"
                  disabled={busy || !canEdit}
                />
              </Field>
            </Panel>
          )}
        </div>
      </div>

      <AdaptiveFollowups
        strategy={displayStrategy}
        savedStrategy={strategy}
        canEdit={!!canMutateGraph}
        canWrite={!!allowWriteMessages}
        unsaved={!!pendingSteps || segmentDirty}
        segment={segmentDraft}
        segmentDirty={segmentDirty}
        onBusy={setBusy}
        onUpdated={(row) => {
          const linked = ensureStepLinks(row);
          setStrategy(linked);
          setPendingSteps(null);
          setTextWarnings(linked.text_warnings || []);
          setSegmentDraft({ ...(linked.segment || {}) });
          setSegmentDirty(false);
          const focus = draftStep?.id;
          if (focus) {
            const refreshed = findStep(linked, focus);
            if (refreshed) {
              setDraftStep({ ...refreshed, id: focus, config: { ...(refreshed.config || {}) } });
            }
          }
        }}
        onNotice={(message) => {
          setNotice(message);
          if (message) setError("");
        }}
        onError={(message) => {
          setError(message);
          if (message) setNotice("");
        }}
      />

      <EmailOptimizationPanel
        strategy={strategy}
        stepId={draftStep?.id}
        canEdit={!!canMutateGraph && !busy}
        unsaved={!!pendingSteps || segmentDirty}
        onWorkflowUpdated={(updated) => {
          const linked = ensureStepLinks(updated);
          setStrategy(linked);
          setPendingSteps(null);
          setSegmentDraft({ ...(linked.segment || {}) });
          setSegmentDirty(false);
          const focus = draftStep?.id;
          if (focus) {
            const refreshed = findStep(linked, focus);
            if (refreshed) {
              setDraftStep({ ...refreshed, id: focus, config: { ...(refreshed.config || {}) } });
            }
          }
          setError("");
          setNotice(
            linked.status === "Under Review"
              ? "Recommendation saved. The workflow is Under Review and must be approved and activated before new accounts use it."
              : `Recommendation saved. Workflow status: ${linked.status}.`,
          );
        }}
      />

      <StepEditorDialog
        strategy={displayStrategy}
        step={draftStep}
        catalog={catalog}
        open={expandOpen}
        canEdit={!!canMutateGraph && !busy}
        canWriteMessages={allowWriteMessages}
        writingMessages={writingMessages}
        unsaved={!!pendingSteps || segmentDirty}
        savedConfig={draftStep?.id ? findStep(strategy, draftStep.id)?.config || null : null}
        textWarnings={textWarnings}
        onClose={() => setExpandOpen(false)}
        onChange={patchDraft}
        onSaveVersion={(patch) =>
          persistSteps(patch ? "Removed communication version" : "Saved communication version", patch)
        }
        onRewriteMessage={(remarks, audience) => {
          if (!draftStep?.id) return Promise.resolve(false);
          return writeMessages({ step_id: draftStep.id, remarks, audience });
        }}
        onToggleDisabled={() => {
          if (!draftStep) return;
          const flipped = {
            ...draftStep,
            disabled: !draftStep.disabled,
            origin: "Human Modified" as const,
          };
          setDraftStep(flipped);
          applyLocalSteps(
            workingSteps().map((s) => (s.id === flipped.id ? flipped : s)),
            flipped.id,
          );
        }}
        onAddAfter={(kind) => {
          if (!draftStep?.id) return;
          const next = addStepAfter(workingSteps(), draftStep.id, kind);
          const created = next.find(
            (s) => !workingSteps().some((o) => (o.id || "") === (s.id || "")),
          );
          applyLocalSteps(next, created?.id || draftStep.id);
        }}
        onRemove={() => {
          if (!draftStep?.id) return;
          const next = removeStep(workingSteps(), draftStep.id);
          applyLocalSteps(next, strategy.entry_node_id || next[0]?.id || null);
          setExpandOpen(false);
        }}
      />

      <WorkflowActionNoteModal
        open={noteAction === "update"}
        title="Apply step changes"
        description="Describe why this edit was made. The note is stored in version history for AI learning."
        confirmLabel="Apply changes"
        busy={busy}
        required={false}
        placeholder="e.g. SMS timing reduced from 5 days to 3 days after previous email"
        onClose={() => setNoteAction(null)}
        onConfirm={(note) => void onNoteConfirm(note)}
      />
      <WorkflowActionNoteModal
        open={noteAction === "approve"}
        title="Approve strategy"
        description="Optional note for the approval record and AI reassessment history."
        confirmLabel="Approve"
        busy={busy}
        required={false}
        onClose={() => setNoteAction(null)}
        onConfirm={(note) => void onNoteConfirm(note)}
      />
      <WorkflowActionNoteModal
        open={noteAction === "activate"}
        title="Activate workflow"
        description="Optional note recorded when this workflow becomes Active for collection execution."
        confirmLabel="Activate"
        busy={busy}
        required={false}
        onClose={() => setNoteAction(null)}
        onConfirm={(note) => void onNoteConfirm(note)}
      />
      <WorkflowActionNoteModal
        open={noteAction === "reject"}
        title={isAiGenerated ? "Reject & regenerate" : "Reject workflow"}
        description={
          isAiGenerated
            ? "Your remarks are sent to PayFlow AI to regenerate a new AI Proposed workflow."
            : "Explain what should change. Status will return to Draft."
        }
        confirmLabel={isAiGenerated ? "Reject & regenerate" : "Reject"}
        busy={busy}
        required={isAiGenerated}
        minLength={isAiGenerated ? 3 : 0}
        placeholder="e.g. reduce contact volume for low balances; wait longer after SMS"
        initialNote={rejectNote}
        onClose={() => setNoteAction(null)}
        onConfirm={(note) => {
          setRejectNote(note);
          void onNoteConfirm(note);
        }}
      />

      <ConfirmDelete
        open={confirmDelete}
        title={`Delete ${strategy.name}?`}
        description="This deletes the workflow. Linked accounts are not deleted. The action is logged."
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
      />
    </>
  );
}
