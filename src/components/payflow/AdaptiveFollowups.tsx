import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import {
  listAdaptiveFollowUpTypes,
  updatePayflowWorkflow,
  writePayflowWorkflowMessages,
} from "../../api/payflow";
import {
  followUpHasText,
  followUpLevel,
  isNoFollowUpToWrite,
  waitingPeriodLabel,
} from "../../lib/adaptive-workflow";
import { sameConfig } from "../../lib/message-versions";
import {
  EDIT_DEMOTES_WARNING,
  editDemotesWorkflow,
  isFollowUpStep,
  toStepPayload,
} from "../../lib/strategy-workflow";
import type { PayflowStrategy, PayflowStrategyStep, PayflowStrategyStepConfig } from "../../types";
import type { PayflowAdaptiveFollowUpType } from "../../types/adaptive";
import { Modal } from "../ui/Modal";
import { CommunicationVersionEditor } from "./communication-version-editor";
import { Btn, Panel, StatusPill, ToggleRow } from "./lovable/payflow-ui";

type Props = {
  strategy: PayflowStrategy;
  /** Last saved workflow. Dirty checks use this, not unsaved canvas edits. */
  savedStrategy: PayflowStrategy;
  canEdit: boolean;
  canWrite: boolean;
  unsaved: boolean;
  segment?: Record<string, string>;
  segmentDirty?: boolean;
  onUpdated: (strategy: PayflowStrategy) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onBusy?: (busy: boolean) => void;
};

function stepKey(step: PayflowStrategyStep, index: number) {
  return step.id || `s${index + 1}`;
}

export function AdaptiveFollowups({
  strategy,
  savedStrategy,
  canEdit,
  canWrite,
  unsaved,
  segment,
  segmentDirty,
  onUpdated,
  onNotice,
  onError,
  onBusy,
}: Props) {
  const enabled = strategy.adaptive !== false;
  const [types, setTypes] = useState<PayflowAdaptiveFollowUpType[]>([]);
  const [typesError, setTypesError] = useState("");
  const [writing, setWriting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [selectedFor, setSelectedFor] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [draftSteps, setDraftSteps] = useState<PayflowStrategyStep[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listAdaptiveFollowUpTypes()
      .then((res) => {
        if (!cancelled) setTypes(res.items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setTypesError(err instanceof ApiError ? err.detail : "Could not load follow-up types.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = strategy.steps || [];
  const catalog = useMemo(() => {
    const known = new Set(types.map((type) => type.follow_up_for));
    const extras: PayflowAdaptiveFollowUpType[] = [];
    for (const step of steps) {
      const key = step.config?.follow_up_for;
      if (!isFollowUpStep(step) || !key || known.has(key)) continue;
      known.add(key);
      const siblings = steps.filter((item) => item.config?.follow_up_for === key);
      extras.push({
        follow_up_for: key,
        label: step.title || key.replace(/_/g, " "),
        trigger: "",
        levels: siblings.map((item) => ({
          level: followUpLevel(item),
          name: followUpLevel(item) === 2 ? "Repeat" : "First time",
          step_title: item.title,
        })),
      });
    }
    return [...types, ...extras];
  }, [steps, types]);
  const rows = useMemo(() => {
    return catalog
      .map((type) => {
        const matches = steps
          .map((step, index) => ({ step, id: stepKey(step, index) }))
          .filter(
            (item) =>
              isFollowUpStep(item.step) && item.step.config?.follow_up_for === type.follow_up_for,
          );
        if (!matches.length) return null;
        const levels = (type.levels || [])
          .map((entry) => {
            const found = matches.find((item) => followUpLevel(item.step) === entry.level);
            return found ? { ...entry, step: found.step, id: found.id } : null;
          })
          .filter((entry): entry is NonNullable<typeof entry> => !!entry);
        const extras = matches.filter(
          (item) => !levels.some((entry) => entry.level === followUpLevel(item.step)),
        );
        for (const extra of extras) {
          const stepLevel = followUpLevel(extra.step);
          levels.push({
            level: stepLevel,
            name: stepLevel === 2 ? "Repeat" : "First Time",
            step_title: extra.step.title,
            step: extra.step,
            id: extra.id,
          });
        }
        levels.sort((a, b) => a.level - b.level);
        return { type, levels };
      })
      .filter((row): row is NonNullable<typeof row> => !!row);
  }, [catalog, steps]);

  const needsWrite =
    enabled &&
    (rows.length === 0 ||
      rows.some((row) => row.levels.some((entry) => !followUpHasText(entry.step))));

  const selected = rows.find((row) => row.type.follow_up_for === selectedFor) || null;
  const activeLevel =
    selected?.levels.find((entry) => entry.level === level) || selected?.levels[0] || null;
  const draftStep = draftSteps
    ?.map((step, index) => ({ step, id: stepKey(step, index) }))
    .find((item) => item.id === activeLevel?.id)?.step;
  const savedStep = (savedStrategy.steps || []).find(
    (step, index) => stepKey(step, index) === activeLevel?.id,
  );

  function refuseUnsaved(action: string) {
    if (!unsaved) return false;
    onNotice("");
    onError(`Save this version first, then ${action}. That uses the saved workflow on the server.`);
    return true;
  }

  async function setAdaptive(next: boolean) {
    if (!canEdit || savingSwitch) return;
    if (refuseUnsaved("change Adaptive")) return;
    setSavingSwitch(true);
    onBusy?.(true);
    onError("");
    onNotice("");
    try {
      const updated = await updatePayflowWorkflow(strategy.id, { adaptive: next });
      onUpdated(updated);
      onNotice(
        next
          ? "Adaptive is on. Follow-ups can replace the next planned reminder."
          : "Adaptive is off. The workflow runs as the fixed flowchart.",
      );
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Could not update Adaptive.");
    } finally {
      setSavingSwitch(false);
      onBusy?.(false);
    }
  }

  async function writeFollowUps() {
    if (!canWrite || writing) return;
    if (refuseUnsaved("write follow-ups")) return;
    setWriting(true);
    onBusy?.(true);
    onError("");
    onNotice("");
    try {
      const updated = await writePayflowWorkflowMessages(strategy.id, { follow_ups_only: true });
      onUpdated(updated);
      onNotice("Follow-ups written. Existing texts and flowchart messages were left as they are.");
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Could not write follow-ups.";
      if (err instanceof ApiError && err.status === 400 && isNoFollowUpToWrite(detail)) {
        onNotice("No follow-ups: nothing for them to replace.");
      } else {
        onError(detail);
      }
    } finally {
      setWriting(false);
      onBusy?.(false);
    }
  }

  function openType(followUpFor: string) {
    setSelectedFor(followUpFor);
    const row = rows.find((item) => item.type.follow_up_for === followUpFor);
    setLevel(row?.levels[0]?.level || 1);
    setDraftSteps((strategy.steps || []).map((step) => ({ ...step, config: { ...(step.config || {}) } })));
    setDialogError("");
  }

  function closeDialog() {
    const dirty = !!draftStep && !sameConfig(draftStep.config, savedStep?.config);
    if (dirty && !window.confirm("Discard unsaved message changes? Saved versions will not change.")) {
      return;
    }
    setSelectedFor(null);
    setDraftSteps(null);
    setDialogError("");
  }

  function patchActive(patch: Partial<PayflowStrategyStepConfig> & { title?: string }) {
    if (!activeLevel || !draftSteps) return;
    setDraftSteps(
      draftSteps.map((step, index) => {
        if (stepKey(step, index) !== activeLevel.id) return step;
        const { title, ...configPatch } = patch;
        return {
          ...step,
          title: title ?? step.title,
          config: { ...(step.config || {}), ...configPatch },
        };
      }),
    );
  }

  async function saveVersion(patch?: Partial<PayflowStrategyStepConfig>) {
    if (!canEdit || !draftSteps || !activeLevel) return false;
    if (editDemotesWorkflow(strategy.status) && !window.confirm(EDIT_DEMOTES_WARNING)) return false;
    setSaving(true);
    setDialogError("");
    onBusy?.(true);
    try {
      const next = draftSteps.map((step, index) => {
        if (stepKey(step, index) !== activeLevel.id) return step;
        const config = { ...(step.config || {}), ...(patch || {}) };
        return {
          ...step,
          origin: "Human Modified",
          config,
          purpose: config.purpose ?? step.purpose,
        };
      });
      const updated = await updatePayflowWorkflow(strategy.id, {
        steps: toStepPayload(next),
        entry_node_id: strategy.entry_node_id || undefined,
        segment: segmentDirty ? segment : undefined,
      });
      onUpdated(updated);
      setDraftSteps(
        (updated.steps || []).map((step) => ({ ...step, config: { ...(step.config || {}) } })),
      );
      onNotice("Follow-up saved. It is approved with the workflow.");
      return true;
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Could not save the follow-up.";
      setDialogError(detail);
      onError(detail);
      return false;
    } finally {
      setSaving(false);
      onBusy?.(false);
    }
  }

  async function regenerate(remarks?: string, audience?: string) {
    if (!canWrite || !activeLevel) return false;
    if (refuseUnsaved("regenerate")) return false;
    setRegenerating(true);
    setDialogError("");
    onBusy?.(true);
    try {
      const updated = await writePayflowWorkflowMessages(strategy.id, {
        step_id: activeLevel.id,
        remarks,
        ...(audience ? { audience } : {}),
      });
      onUpdated(updated);
      setDraftSteps(
        (updated.steps || []).map((step) => ({ ...step, config: { ...(step.config || {}) } })),
      );
      return true;
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Could not regenerate this follow-up.";
      setDialogError(detail);
      onError(detail);
      return false;
    } finally {
      setRegenerating(false);
      onBusy?.(false);
    }
  }

  const setCount = rows.reduce((sum, row) => sum + row.levels.length, 0);

  return (
    <>
      <Panel title="Adaptive Workflow" className="mt-4">
        <ToggleRow
          label="Adaptive"
          description="On by default. Off means the flowchart runs with no follow-ups and no adaptive decisions."
          checked={enabled}
          disabled={!canEdit || savingSwitch}
          onChange={(value) => void setAdaptive(value)}
        />
        <p className="text-xs text-muted-foreground">
          PayFlow watches what this customer does and can replace the next planned reminder. It does
          not add an extra message.
        </p>
        {!enabled ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Disabled · The original fixed-sequence workflow remains unchanged.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                Adaptive Follow-ups
                <span className="ml-2 font-normal text-muted-foreground">
                  {rows.length} Follow-up Type{rows.length === 1 ? "" : "s"} · {setCount}{" "}
                  Communication Set{setCount === 1 ? "" : "s"}
                </span>
              </h3>
              {needsWrite && canWrite ? (
                <Btn disabled={writing || savingSwitch} onClick={() => void writeFollowUps()}>
                  {writing ? "Writing…" : "Write follow-ups"}
                </Btn>
              ) : null}
            </div>
            {writing ? (
              <p className="mt-2 text-[12px] text-muted-foreground">
                Writing follow-up text. This can take a minute. Messages already on the flowchart are
                left as they are.
              </p>
            ) : null}
            {typesError ? <p className="mt-2 text-[12px] text-destructive">{typesError}</p> : null}
            <div className="mt-2 divide-y divide-border">
              {rows.map((row) => (
                <div
                  key={row.type.follow_up_for}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">{row.type.label}</p>
                    {row.type.trigger ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Sent When · {row.type.trigger}
                      </p>
                    ) : null}
                    {row.type.waiting_hours != null ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {waitingPeriodLabel(row.type.waiting_hours)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.levels.map((entry) =>
                      followUpHasText(entry.step) ? (
                        <StatusPill key={entry.level} tone="neutral">
                          {entry.name} · Written
                        </StatusPill>
                      ) : (
                        <StatusPill key={entry.level} tone="warning">
                          Not written yet
                        </StatusPill>
                      ),
                    )}
                    <Btn variant="ghost" onClick={() => openType(row.type.follow_up_for)}>
                      View / Edit
                    </Btn>
                  </div>
                </div>
              ))}
              {!rows.length && !typesError ? (
                <p className="py-3 text-xs text-muted-foreground">
                  No follow-ups on this workflow yet. Write follow-ups when it has a reminder they
                  can replace.
                </p>
              ) : null}
              {rows.some((row) => row.levels.some((entry) => !followUpHasText(entry.step))) ? (
                <p className="pt-3 text-[11px] text-muted-foreground">
                  A follow-up without text is never sent.
                </p>
              ) : null}
            </div>
          </>
        )}
      </Panel>

      <Modal
        open={!!selected && !!draftStep}
        title={selected?.type.label || "Adaptive follow-up"}
        description="Adaptive Follow-up · Finalized with overall workflow approval."
        onClose={closeDialog}
        size="xl"
        showClose
        footer={
          <div className="mt-2 flex justify-end">
            <Btn variant="primary" disabled={saving} onClick={closeDialog}>
              {saving ? "Saving…" : "Done"}
            </Btn>
          </div>
        }
      >
        {selected && draftStep && activeLevel ? (
          <div className="space-y-3">
            <div className="border-b border-border pb-3">
              <p className="text-xs font-semibold">Sent When / Trigger</p>
              <p className="mt-1 text-xs text-muted-foreground">{selected.type.trigger}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {waitingPeriodLabel(selected.type.waiting_hours)}
              </p>
            </div>
            {selected.levels.length > 1 ? (
              <div
                role="tablist"
                aria-label="Occurrence"
                className="inline-flex w-fit rounded-md border border-border bg-muted/40 p-0.5"
              >
                {selected.levels.map((entry) => (
                  <button
                    key={entry.level}
                    type="button"
                    role="tab"
                    aria-selected={entry.level === activeLevel.level}
                    className={`rounded px-3 py-1 text-xs font-medium ${
                      entry.level === activeLevel.level
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => {
                      if (entry.level === activeLevel.level) return;
                      const dirty = !sameConfig(draftStep.config, savedStep?.config);
                      if (dirty && !window.confirm("Discard unsaved changes in this set?")) return;
                      if (dirty) {
                        setDraftSteps(
                          (savedStrategy.steps || []).map((step) => ({
                            ...step,
                            config: { ...(step.config || {}) },
                          })),
                        );
                      }
                      setLevel(entry.level);
                    }}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium">{activeLevel.name}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {activeLevel.level === 1
                ? "Used the first time this situation happens."
                : "Used when the same situation happens again."}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Channel</p>
                <p className="mt-1 text-[13px] font-medium">Email or SMS, chosen when sending</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Message Purpose</p>
                <p className="mt-1 text-[13px] font-medium">
                  {draftStep.config?.purpose || "Payment Reminder"}
                </p>
              </div>
            </div>
            {!followUpHasText(draftStep) ? (
              <StatusPill tone="warning">Not written yet · a follow-up without text is never sent</StatusPill>
            ) : null}
            {dialogError ? <p className="text-[12.5px] text-destructive">{dialogError}</p> : null}
            <CommunicationVersionEditor
              strategy={strategy}
              step={draftStep}
              savedConfig={savedStep?.config}
              canEdit={canEdit}
              canWriteMessages={canWrite}
              writingMessages={regenerating}
              saving={saving}
              unsaved={!sameConfig(draftStep.config, savedStep?.config)}
              followUp
              onChange={patchActive}
              onSaveVersion={saveVersion}
              onRewriteMessage={regenerate}
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
