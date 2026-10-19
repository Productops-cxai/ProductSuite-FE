import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
} from "../../api/payflow";
import { StrategyCanvas } from "../../components/payflow/strategy-canvas";
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
import {
  addStepAfter,
  assignDraftTemplates,
  buildStepsFromDraft,
  ensureStepLinks,
  originTone,
  removeStep,
  stepConfig,
  strategyStatusTone,
  suggestFromPrompt,
  templateById,
  type AddableStepKind,
} from "../../lib/strategy-workflow";
import type {
  PayflowStrategy,
  PayflowStrategyCatalog,
  PayflowStrategyStep,
  PayflowStrategyStepConfig,
} from "../../types";

type NoteAction = "update" | "approve" | "activate" | "reject";

function findStep(strategy: PayflowStrategy, id: string | null): PayflowStrategyStep | null {
  if (!id) return null;
  return (strategy.steps || []).find((s, i) => (s.id || `s${i + 1}`) === id) || null;
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
  const [resuggestPrompt, setResuggestPrompt] = useState("");
  const [segmentDraft, setSegmentDraft] = useState<Record<string, string>>({});
  const [segmentDirty, setSegmentDirty] = useState(false);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load workflow");
      setStrategy(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId]);

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
    if (!draftStep) return;
    const { title, ...cfgPatch } = patch;
    const nextCfg = { ...(draftStep.config || {}), ...cfgPatch };
    const updated: PayflowStrategyStep = {
      ...draftStep,
      title: title !== undefined ? title : draftStep.title,
      config: nextCfg,
      channel: nextCfg.channel ?? draftStep.channel,
      purpose: nextCfg.purpose ?? draftStep.purpose,
      origin: "Human Modified",
    };
    setDraftStep(updated);
    const steps = workingSteps().map((s, i) => {
      const id = s.id || `s${i + 1}`;
      return id === updated.id ? { ...updated, id } : s;
    });
    applyLocalSteps(steps, updated.id);
  }

  async function persistSteps(note?: string) {
    if (!strategy) return;
    setBusy(true);
    setError("");
    try {
      const steps = workingSteps().map((s, i) => {
        const id = s.id || `s${i + 1}`;
        if (!draftStep || id !== draftStep.id) {
          return { ...s, id };
        }
        const cfg = { ...(draftStep.config || {}) };
        return {
          ...draftStep,
          id,
          config: cfg,
          channel: cfg.channel ?? draftStep.channel,
          purpose: cfg.purpose ?? draftStep.purpose,
          origin: "Human Modified",
        };
      });
      const updated = ensureStepLinks(
        await updatePayflowWorkflow(strategy.id, {
          steps: steps.map((s) => ({
            id: s.id || undefined,
            kind: s.kind,
            title: s.title,
            origin: s.origin || undefined,
            disabled: s.disabled,
            config: s.config || undefined,
            next: s.next ?? null,
            yes: s.yes ?? null,
            no: s.no ?? null,
            channel: s.channel ?? null,
            purpose: s.purpose ?? null,
            timing: s.timing ?? null,
            detail: s.detail ?? null,
          })),
          entry_node_id: strategy.entry_node_id || undefined,
          segment: segmentDirty ? segmentDraft : undefined,
          note: note || undefined,
        }),
      );
      setStrategy(updated);
      setSegmentDraft({ ...(updated.segment || {}) });
      setSegmentDirty(false);
      setPendingSteps(null);
      setNotice(
        strategy.status === "Approved" || strategy.status === "Active"
          ? "Prior approved configuration archived. Changes recorded as Human Modified — not activated."
          : "Change recorded as Human Modified. Workflow is not activated by editing.",
      );
      if (draftStep?.id) {
        const refreshed = findStep(updated, draftStep.id);
        if (refreshed) setDraftStep({ ...refreshed, id: draftStep.id });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update workflow");
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

  async function onNoteConfirm(note: string) {
    if (!strategy || !noteAction) return;
    if (noteAction === "update") {
      await persistSteps(note);
      return;
    }
    if (noteAction === "approve") {
      await runAction(
        () => approvePayflowWorkflow(strategy.id, { note: note || undefined }),
        (row) =>
          `Strategy approved${row.approved_by ? ` by ${row.approved_by}` : ""}. Activate it when ready for collection execution.`,
      );
      return;
    }
    if (noteAction === "activate") {
      await runAction(
        () => activatePayflowWorkflow(strategy.id, { note: note || undefined }),
        "Workflow is now Active for collection execution.",
      );
      return;
    }
    if (noteAction === "reject") {
      const isAi = strategy.source === "AI Generated";
      if (isAi && note.trim().length < 3) {
        setError("Remarks of at least 3 characters are required to regenerate.");
        setNoteAction(null);
        return;
      }
      setBusy(true);
      setError("");
      try {
        await rejectPayflowWorkflow(strategy.id, { note: note || undefined });
        setRejectNote("");
        if (isAi) {
          const regenerated = ensureStepLinks(
            await regeneratePayflowWorkflow(strategy.id, { remarks: note.trim() }),
          );
          setNotice("Rejected and regenerated. Opening the new AI-proposed workflow.");
          navigate(`/payflow/workflows/${regenerated.id}`);
          return;
        }
        const refreshed = ensureStepLinks(await getPayflowWorkflow(strategy.id));
        setStrategy(refreshed);
        setPendingSteps(null);
        setNotice("Returned for changes. Status reset; history is retained.");
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Reject / regenerate failed");
      } finally {
        setBusy(false);
        setNoteAction(null);
      }
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

  /** AI workflow: create a new AI Proposed revision from remarks (original kept). */
  async function onResuggestAi() {
    if (!strategy) return;
    const remarks = rejectNote.trim();
    if (remarks.length < 3) {
      setError("Add a short note (at least 3 characters) describing what to change, then Re-suggest.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const regenerated = ensureStepLinks(
        await regeneratePayflowWorkflow(strategy.id, { remarks }),
      );
      setRejectNote("");
      setNotice("New AI-proposed steps ready. Opening the re-suggested workflow.");
      navigate(`/payflow/workflows/${regenerated.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Re-suggest failed");
    } finally {
      setBusy(false);
    }
  }

  /** Human-created workflow: local re-suggest into the builder (same screen). */
  function onResuggestHuman() {
    if (!strategy) return;
    const draft = suggestFromPrompt(resuggestPrompt, segmentDraft);
    const built = assignDraftTemplates(
      buildStepsFromDraft(draft),
      catalog?.message_templates || [],
    );
    applyLocalSteps(built, built.find((s) => s.kind !== "Trigger")?.id || null);
    setSelectedId(null);
    setDraftStep(null);
    setNotice(
      "Steps re-suggested on this screen. Review the flow, then Apply step changes to save.",
    );
    setError("");
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
  // Lovable: humanCreated = origin Human Created (Human Modified AI workflows still get Reject + regen).
  const isHumanCreated =
    strategy.origin === "Human Created" || strategy.source === "Human Created";
  const isAiGenerated = !isHumanCreated && (
    strategy.source === "AI Generated" ||
    strategy.origin === "AI Proposed" ||
    strategy.origin === "Human Modified"
  );
  const humanModifiedCount = (strategy.steps || []).filter(
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
  // Editable while still in the review pipeline; Approved/Active match lovable read-only chips.
  const canMutateGraph = canEdit && (isAiProposed || isDraft || isUnderReview);
  const canApprove = canEdit && (isAiProposed || isUnderReview);
  // Lovable: Reject only for AI (not human-created).
  const canReject =
    canEdit && isAiGenerated && (isAiProposed || isUnderReview || isApproved);
  const canActivate = canEdit && (isApproved || (isInactive && !!strategy.approved_by));
  const canDeactivate = canEdit && isActive;
  const canSubmitReview = canEdit && isDraft;
  const canSaveDraft = canEdit && !isActive && !isApproved;
  // Lovable: Delete only for human-created.
  const showDelete = canDelete && isHumanCreated && !isActive;
  // Lovable: AI banner only while origin is still "AI Proposed".
  const showAiBanner = strategy.origin === "AI Proposed" && strategy.status !== "Active";
  // Lovable: Request regeneration for every non-human-created workflow (AI / Human Modified).
  const showRequestRegen = canEdit && isAiGenerated && !isActive && !isInactive;
  // Human Draft / Under Review: local re-suggest on this screen.
  const showHumanResuggest = canEdit && isHumanCreated && canMutateGraph;
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
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={strategyStatusTone(strategy.status)} dot>
              {strategy.status}
            </StatusPill>
            <StatusPill>v{strategy.version}</StatusPill>
            {(strategy.human_modified || strategy.origin === "Human Modified") && (
              <StatusPill tone="info">Human Modified</StatusPill>
            )}
            {canSubmitReview && (
              <Btn
                disabled={busy}
                onClick={() =>
                  void runAction(
                    () => submitPayflowWorkflowReview(strategy.id),
                    "Submitted for review.",
                  )
                }
              >
                Submit for review
              </Btn>
            )}
            {canSaveDraft && (
              <Btn
                disabled={busy}
                onClick={() =>
                  void runAction(() => savePayflowWorkflowDraft(strategy.id), "Draft saved.")
                }
              >
                Save Draft
              </Btn>
            )}
            {canReject && (
              <Btn
                variant="danger"
                disabled={busy}
                onClick={() => setNoteAction("reject")}
              >
                Reject / Request Regeneration
              </Btn>
            )}
            {canApprove && (
              <Btn
                variant="primary"
                disabled={busy}
                onClick={() => setNoteAction("approve")}
              >
                Approve Strategy
              </Btn>
            )}
            {canActivate && (
              <Btn
                variant="primary"
                disabled={busy}
                onClick={() => setNoteAction("activate")}
              >
                Activate
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
            {/* {showDelete ? (
              <Btn variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                Delete
              </Btn>
            ) : null} */}
          </div>
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

      {showAiBanner && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ai/25 bg-ai/[0.06] px-4 py-3.5">
          <div>
            <p className="text-[13px] font-semibold text-foreground">AI Proposed Strategy</p>
            <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
              PayFlow generated this strategy using the available portfolio, account, payment and
              engagement context. Review each step, adjust what needs changing, then approve.
            </p>
          </div>
          {(strategy.ai_context || []).length > 0 && (
            <Btn onClick={() => setShowContext((v) => !v)}>
              {showContext ? "Hide reasoning" : "Why PayFlow proposed this strategy"}
            </Btn>
          )}
        </div>
      )}

      {showContext && (strategy.ai_context || []).length > 0 && (
        <Panel
          title="Why PayFlow proposed this strategy"
          description="Operational context only. Strategy decisions never use demographic attributes."
          className="mb-4"
        >
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {strategy.ai_context.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-1.5"
              >
                <dt className="text-[12px] text-muted-foreground">{item.label}</dt>
                <dd className="text-[12.5px] font-medium text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      {segmentLabelRows.length > 0 && (
        <Panel
          title="Who this strategy applies to"
          description="Operational and geographic attributes only. Protected attributes are never used for targeting."
          className="mb-4"
        >
          <div className="flex flex-wrap gap-1.5">
            {segmentLabelRows.map((item) => (
              <span
                key={item.label}
                className="rounded-lg border border-border/70 bg-surface px-2.5 py-1.5 text-[11.5px]"
              >
                <span className="text-muted-foreground">{item.label}: </span>
                <span className="font-medium text-foreground">{item.value}</span>
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] text-muted-foreground">
            Excluded from targeting: {excluded.join(", ")}.
          </p>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel
          title="Strategy flow"
          description="Click a step to review it, or use the expand icon to edit it in a popup."
          bodyClassName="p-3"
        >
          <StrategyCanvas
            strategy={displayStrategy}
            selectedId={selectedId}
            onSelect={selectStep}
            onExpand={(id) => {
              selectStep(id);
              setExpandOpen(true);
            }}
            templateSnippetFor={(node) => {
              const cfg = stepConfig(node);
              const tpl = templateById(catalog?.message_templates || [], cfg.template_id);
              if (!tpl?.body) return null;
              return tpl.body.slice(0, 120);
            }}
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
              action={
                <Btn onClick={() => setExpandOpen(true)}>Expand</Btn>
              }
            >
              <StepConfigForm
                strategy={displayStrategy}
                step={draftStep}
                catalog={catalog}
                canEdit={!!canMutateGraph && !busy}
                onChange={patchDraft}
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
              <Btn onClick={() => setShowAudit((v) => !v)}>
                {showAudit ? "Hide" : "View changes"}
              </Btn>
            }
          >
            <dl className="space-y-1.5 text-[12.5px]">
              {(
                [
                  ["Origin", strategy.origin],
                  ...(!isHumanCreated
                    ? [["Human modified steps", String(humanModifiedCount)] as const]
                    : []),
                  ["Approved By", strategy.approved_by || "Not yet approved"],
                  ["Approval Date", strategy.approval_date || "—"],
                  ["Strategy Version", `v${strategy.version}`],
                  [
                    "Cases covered",
                    strategy.cases_covered != null
                      ? strategy.cases_covered.toLocaleString()
                      : strategy.coverage || "—",
                  ],
                ] as const
              ).map(([label, value]) => (
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
                  <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                    Original AI steps were captured before the first human edit and are retained
                    for traceability. Prior approved configurations are archived into version
                    history rather than overwritten.
                  </p>
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
                            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                              {v.status}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{v.date}</span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">{v.note}</p>
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
              <Field label="Note for PayFlow" hint="Optional. Explain what should change.">
                <TextArea
                  value={rejectNote}
                  onChange={setRejectNote}
                  placeholder="e.g. reduce contact volume for low balances"
                  disabled={busy}
                />
              </Field>
              <Btn
                className="mt-2"
                variant="primary"
                disabled={busy}
                onClick={() => void onResuggestAi()}
              >
                <SparklesIcon className="size-3.5" />
                {busy ? "Re-suggesting…" : "Re-suggest steps"}
              </Btn>
            </Panel>
          )}

          {showHumanResuggest && (
            <Panel
              title="Ask PayFlow AI"
              description="Describe the outcome you want. AI suggests the steps; you stay in control."
              action={<StatusPill tone="ai">AI</StatusPill>}
            >
              <Field label="Your prompt">
                <TextArea
                  value={resuggestPrompt}
                  onChange={setResuggestPrompt}
                  placeholder="e.g. gentle SMS-first reminder for small balances, offer an installment plan if there is no payment after a week"
                  disabled={busy}
                />
              </Field>
              <Btn
                className="mt-2"
                variant="primary"
                disabled={busy}
                onClick={onResuggestHuman}
              >
                <SparklesIcon className="size-3.5" />
                Re-suggest steps
              </Btn>
            </Panel>
          )}
        </div>
      </div>

      <StepEditorDialog
        strategy={displayStrategy}
        step={draftStep}
        catalog={catalog}
        open={expandOpen}
        canEdit={!!canMutateGraph && !busy}
        onClose={() => setExpandOpen(false)}
        onChange={patchDraft}
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
        title={
          isAiGenerated ? "Reject & regenerate" : "Reject workflow"
        }
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
