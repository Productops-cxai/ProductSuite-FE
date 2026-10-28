import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  getPayflowWorkflow,
  listPayflowWorkflows,
  updatePayflowWorkflow,
  writePayflowWorkflowMessages,
  type PayflowWorkflowStepPayload,
} from "../../api/payflow";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import {
  addStepAfter,
  canWriteWorkflowMessages,
  communicationSnippet,
  ensureStepLinks,
  strategyStatusTone,
  type AddableStepKind,
} from "../../lib/strategy-workflow";
import type {
  PayflowStrategy,
  PayflowStrategyCatalog,
  PayflowStrategyStep,
  PayflowStrategyStepConfig,
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

export function resolveWorkflowByName(
  strategies: PayflowStrategy[],
  workflowName?: string | null,
): PayflowStrategy | undefined {
  if (!strategies.length) return undefined;
  if (!workflowName) return strategies[0];
  const wanted = tokens(workflowName);
  let best = strategies[0];
  let bestScore = -1;
  for (const s of strategies) {
    const have = tokens(`${s.name} ${s.summary || ""}`);
    const score = wanted.filter((t) => have.includes(t)).length;
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

function findStep(strategy: PayflowStrategy, id: string | null): PayflowStrategyStep | null {
  if (!id) return null;
  return (strategy.steps || []).find((s, i) => (s.id || `s${i + 1}`) === id) || null;
}

function toStepPayload(steps: PayflowStrategyStep[]): PayflowWorkflowStepPayload[] {
  return steps.map((s, i) => ({
    id: s.id || `s${i + 1}`,
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
  }));
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
    setSelectedId(id);
    setSaveError("");
    setDialogOpen(true);
  }

  function commit(next: PayflowStrategy, focusId?: string | null) {
    setStrategy(ensureStepLinks(next));
    setDirty(true);
    if (focusId) setSelectedId(focusId);
  }

  function patchStep(patch: Partial<PayflowStrategyStepConfig> & { title?: string }) {
    if (!strategy || !selectedStep) return;
    const { title: nextTitle, ...cfgPatch } = patch;
    const nextCfg = { ...(selectedStep.config || {}), ...cfgPatch };
    const updated: PayflowStrategyStep = {
      ...selectedStep,
      title: nextTitle !== undefined ? nextTitle : selectedStep.title,
      config: nextCfg,
      channel: nextCfg.channel ?? selectedStep.channel,
      purpose: nextCfg.purpose ?? selectedStep.purpose,
      origin: "Human Modified",
    };
    const steps = (strategy.steps || []).map((s, i) => {
      const id = s.id || `s${i + 1}`;
      return id === updated.id ? { ...updated, id } : s;
    });
    commit({ ...strategy, steps }, updated.id);
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

  async function closeDialog() {
    if (busy || writingMessages) return;
    if (!dirty || !strategy || !canEdit) {
      setDialogOpen(false);
      setSaveError("");
      return;
    }
    setBusy(true);
    setSaveError("");
    try {
      const updated = ensureStepLinks(
        await updatePayflowWorkflow(strategy.id, {
          steps: toStepPayload(strategy.steps || []),
          entry_node_id: strategy.entry_node_id || undefined,
          note: "Adjusted from the workflow map",
        }),
      );
      setStrategy(updated);
      setDirty(false);
      setDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.detail : "Failed to save step changes");
    } finally {
      setBusy(false);
    }
  }

  async function rewriteSelectedMessage(remarks?: string) {
    if (!strategy || !selectedStep?.id) return;
    if (dirty) {
      setSaveError(
        "Save step changes first (close the editor), then rewrite with AI. Writing uses the saved workflow.",
      );
      return;
    }
    setWritingMessages(true);
    setSaveError("");
    try {
      const updated = ensureStepLinks(
        await writePayflowWorkflowMessages(strategy.id, {
          step_id: selectedStep.id,
          remarks,
        }),
      );
      setStrategy(updated);
      setDirty(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.detail : "Failed to rewrite message");
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
        canEdit={canEdit && !busy && !writingMessages}
        busy={busy || writingMessages}
        error={saveError}
        canWriteMessages={allowWriteMessages}
        writingMessages={writingMessages}
        onClose={() => {
          void closeDialog();
        }}
        onChange={patchStep}
        onToggleDisabled={toggleDisabled}
        onAddAfter={addAfter}
        onRewriteMessage={(remarks) => void rewriteSelectedMessage(remarks)}
      />
    </Panel>
  );
}
