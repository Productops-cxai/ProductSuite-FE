import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  getPayflowWorkflow,
  listPayflowWorkflows,
  updatePayflowWorkflow,
  writePayflowWorkflowMessages,
} from "../../api/payflow";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { sameConfig } from "../../lib/message-versions";
import {
  addStepAfter,
  canWriteWorkflowMessages,
  communicationSnippet,
  EDIT_DEMOTES_WARNING,
  editDemotesWorkflow,
  ensureStepLinks,
  isRejectedWorkflowStatus,
  stepChannelFor,
  strategyStatusTone,
  toStepPayload,
  type AddableStepKind,
} from "../../lib/strategy-workflow";
import type {
  PayflowStrategy,
  PayflowStrategyCatalog,
  PayflowStrategyStep,
  PayflowStrategyStepConfig,
  PayflowTextWarning,
} from "../../types";
import { StrategyCanvas } from "./strategy-canvas";
import { StepEditorDialog } from "./strategy-step-editor";
import { Btn, Panel, StatusPill } from "./lovable/payflow-ui";

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * The workflow with this name, or nothing.
 *
 * It used to fall back to the closest-sounding workflow, or simply the client's
 * first one, so a case could show (and let a reviewer edit) a workflow it is
 * not on. A wrong map is worse than no map.
 */
export function resolveWorkflowByName(
  strategies: PayflowStrategy[],
  workflowName?: string | null,
): PayflowStrategy | undefined {
  const wanted = tokens(workflowName || "").join(" ");
  if (!wanted) return undefined;
  const matches = strategies.filter((s) => tokens(s.name).join(" ") === wanted);
  if (matches.length <= 1) return matches[0];
  // Same name more than once: the one in use wins.
  return matches.find((s) => s.status === "Active") || matches[0];
}

function findStep(strategy: PayflowStrategy, id: string | null): PayflowStrategyStep | null {
  if (!id) return null;
  return (strategy.steps || []).find((s, i) => (s.id || `s${i + 1}`) === id) || null;
}

/**
 * Embedded workflow canvas. Clicking a tile opens the same step popup used in
 * the Strategy Builder (trigger, communication, wait, condition, human review, outcome).
 */
export function WorkflowFlowPanel({
  clientId,
  workflowName,
  exceptionStepId,
  strategyId,
  title = "Collection Workflow",
  description = "Same visual map used in the Strategy Builder. Click a step to open its configuration.",
  className,
}: {
  clientId?: number | null;
  workflowName?: string | null;
  /** Highlight the step that triggered this human review. */
  exceptionStepId?: string | null;
  /** Prefer loading this strategy id when known (more reliable than name match). */
  strategyId?: number | null;
  title?: string;
  description?: string;
  className?: string;
}) {
  const { hasPermission } = usePayFlowAccess();
  const canEdit = hasPermission("create_edit_workflows");
  const [catalog, setCatalog] = useState<PayflowStrategyCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<PayflowStrategy | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [writingMessages, setWritingMessages] = useState(false);
  const [textWarnings, setTextWarnings] = useState<PayflowTextWarning[]>([]);
  const [baselineConfig, setBaselineConfig] = useState<PayflowStrategyStepConfig | null>(null);
  const [baselineStep, setBaselineStep] = useState<PayflowStrategyStep | null>(null);
  const canMutate = canEdit && !isRejectedWorkflowStatus(strategy?.status);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStrategy(null);
    setDialogOpen(false);
    setSelectedId(null);
    setDirty(false);
    const load = async () => {
      const res = await listPayflowWorkflows(clientId ? { client_id: clientId } : {});
      if (cancelled) return;
      const rows = (res.strategies || []).map(ensureStepLinks);
      if (res.catalog) setCatalog(res.catalog);

      let match: PayflowStrategy | undefined;
      if (strategyId) {
        match = rows.find((s) => s.id === strategyId);
        if (!match) {
          try {
            match = ensureStepLinks(await getPayflowWorkflow(strategyId));
          } catch {
            match = undefined;
          }
        }
      }
      if (!match) match = resolveWorkflowByName(rows, workflowName);
      if (!match) {
        setStrategy(null);
        return;
      }
      try {
        const full = ensureStepLinks(await getPayflowWorkflow(match.id));
        if (!cancelled) setStrategy(full);
      } catch {
        if (!cancelled) setStrategy(match);
      }
    };
    load()
      .catch(() => {
        if (!cancelled) setStrategy(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, workflowName, strategyId]);

  const selectedStep = useMemo(
    () => (strategy ? findStep(strategy, selectedId) : null),
    [strategy, selectedId],
  );

  function openStep(id: string) {
    const step = strategy ? findStep(strategy, id) : null;
    setSelectedId(id);
    setBaselineConfig({ ...(step?.config || {}) });
    setBaselineStep(step ? { ...step, config: { ...(step.config || {}) } } : null);
    setSaveError("");
    setDialogOpen(true);
  }

  function commit(next: PayflowStrategy, focusId?: string | null, markDirty = true) {
    setStrategy(ensureStepLinks(next));
    setDirty(markDirty);
    if (focusId) setSelectedId(focusId);
  }

  function patchStep(patch: Partial<PayflowStrategyStepConfig> & { title?: string }) {
    if (!strategy || !selectedStep) return;
    const { title: nextTitle, ...cfgPatch } = patch;
    const nextCfg = { ...(selectedStep.config || {}), ...cfgPatch };
    const restored =
      baselineStep &&
      (nextTitle !== undefined ? nextTitle : selectedStep.title) === baselineStep.title &&
      !!selectedStep.disabled === !!baselineStep.disabled &&
      sameConfig(nextCfg, baselineConfig || {});
    const updated: PayflowStrategyStep = restored
      ? { ...baselineStep, id: selectedStep.id }
      : {
          ...selectedStep,
          title: nextTitle !== undefined ? nextTitle : selectedStep.title,
          config: nextCfg,
          channel: stepChannelFor(selectedStep.kind, nextCfg, selectedStep.channel),
          purpose: nextCfg.purpose ?? selectedStep.purpose,
          origin: "Human Modified",
        };
    const steps = (strategy.steps || []).map((s, i) => {
      const id = s.id || `s${i + 1}`;
      return id === updated.id ? { ...updated, id } : s;
    });
    const othersUntouched = steps.every((s) => s.id === updated.id || s.origin !== "Human Modified");
    commit({ ...strategy, steps }, updated.id, !(restored && othersUntouched));
  }

  function toggleDisabled() {
    if (!strategy || !selectedStep?.id) return;
    const updated: PayflowStrategyStep = {
      ...selectedStep,
      disabled: !selectedStep.disabled,
      origin: "Human Modified",
    };
    const steps = (strategy.steps || []).map((s) => (s.id === updated.id ? updated : s));
    commit({ ...strategy, steps }, updated.id);
  }

  function addAfter(kind: AddableStepKind) {
    if (!strategy || !selectedStep?.id) return;
    const next = addStepAfter(strategy.steps || [], selectedStep.id, kind);
    commit({ ...strategy, steps: next }, selectedStep.id);
  }

  async function persistEdits(
    extraPatch?: Partial<PayflowStrategyStepConfig>,
    close = false,
  ): Promise<boolean> {
    if (busy || writingMessages) return false;
    if (!strategy || !canMutate) {
      if (close) setDialogOpen(false);
      return false;
    }
    if (!dirty && !extraPatch) {
      setSaveError("");
      if (close) setDialogOpen(false);
      return true;
    }
    if (editDemotesWorkflow(strategy.status) && !window.confirm(EDIT_DEMOTES_WARNING)) {
      return false;
    }
    const steps = (strategy.steps || []).map((s, i) => {
      const id = s.id || `s${i + 1}`;
      if (!extraPatch || !selectedStep || id !== selectedStep.id) return { ...s, id };
      const cfg = { ...(s.config || {}), ...extraPatch };
      return {
        ...s,
        id,
        config: cfg,
        channel: stepChannelFor(s.kind, cfg, s.channel),
        purpose: cfg.purpose ?? s.purpose,
        origin: "Human Modified",
      };
    });
    setBusy(true);
    setSaveError("");
    try {
      const updated = ensureStepLinks(
        await updatePayflowWorkflow(strategy.id, {
          steps: toStepPayload(steps),
          entry_node_id: strategy.entry_node_id || undefined,
          note: extraPatch
            ? "Removed communication version"
            : close
              ? "Adjusted from the workflow map"
              : "Saved communication version",
        }),
      );
      setStrategy(updated);
      setDirty(false);
      setTextWarnings(updated.text_warnings || []);
      const focus = selectedStep?.id ? findStep(updated, selectedStep.id) : null;
      setBaselineConfig({ ...(focus?.config || {}) });
      if (close) setDialogOpen(false);
      return true;
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.detail : "Failed to save step changes");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function closeDialog() {
    await persistEdits(undefined, true);
  }

  async function rewriteSelectedMessage(remarks?: string, audience?: string): Promise<boolean> {
    if (!strategy || !selectedStep?.id) return false;
    if (dirty) {
      setSaveError(
        "Save this version first, then regenerate. Regenerating uses the saved workflow.",
      );
      return false;
    }
    setWritingMessages(true);
    setSaveError("");
    try {
      const updated = ensureStepLinks(
        await writePayflowWorkflowMessages(strategy.id, {
          step_id: selectedStep.id,
          remarks,
          ...(audience ? { audience } : {}),
        }),
      );
      setStrategy(updated);
      setDirty(false);
      setTextWarnings([]);
      const focus = findStep(updated, selectedStep.id);
      setBaselineConfig({ ...(focus?.config || {}) });
      return true;
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.detail : "Failed to rewrite message");
      return false;
    } finally {
      setWritingMessages(false);
    }
  }

  const allowWriteMessages =
    canEdit && canWriteWorkflowMessages(strategy?.status) &&
    (strategy?.steps || []).some((s) => s.kind === "Communication");

  if (loading) {
    return (
      <Panel title={title} description={description} className={className}>
        <p className="text-[13px] text-muted-foreground">Loading workflow…</p>
      </Panel>
    );
  }

  if (!strategy) {
    return (
      <Panel
        title={title}
        description={workflowName || "No workflow assigned"}
        className={className}
        action={
          <Link to="/payflow/workflows">
            <Btn>Open strategies</Btn>
          </Link>
        }
      >
        <p className="text-[13px] text-muted-foreground">
          {workflowName
            ? `No matching strategy found for “${workflowName}”.`
            : "No collection strategy is currently assigned."}
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title={title}
      description={description}
      className={className}
      bodyClassName="p-3"
      action={
        <Link to={`/payflow/workflows/${strategy.id}`}>
          <Btn>Open in Strategy Builder</Btn>
        </Link>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <span className="text-[13px] font-semibold text-foreground">{strategy.name}</span>
        <StatusPill tone={strategyStatusTone(strategy.status)} dot>
          {strategy.status}
        </StatusPill>
        <StatusPill>v{strategy.version}</StatusPill>
        {strategy.portfolio_name && <StatusPill>{strategy.portfolio_name}</StatusPill>}
      </div>

      <StrategyCanvas
        strategy={strategy}
        selectedId={selectedId}
        highlightId={exceptionStepId}
        onSelect={openStep}
        templateSnippetFor={(node) =>
          communicationSnippet(node, catalog?.message_templates || [])
        }
      />

      <StepEditorDialog
        strategy={strategy}
        step={selectedStep}
        catalog={catalog}
        open={dialogOpen}
        canEdit={canMutate && !busy && !writingMessages}
        busy={busy || writingMessages}
        error={saveError}
        canWriteMessages={allowWriteMessages}
        writingMessages={writingMessages}
        unsaved={dirty}
        savedConfig={baselineConfig}
        textWarnings={textWarnings}
        onClose={() => {
          void closeDialog();
        }}
        onChange={patchStep}
        onToggleDisabled={toggleDisabled}
        onAddAfter={addAfter}
        onSaveVersion={(patch) => persistEdits(patch, false)}
        onRewriteMessage={(remarks, audience) => rewriteSelectedMessage(remarks, audience)}
      />
    </Panel>
  );
}
