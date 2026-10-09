import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  activatePayflowWorkflow,
  approvePayflowWorkflow,
  beginPayflowWorkflowReview,
  deactivatePayflowWorkflow,
  deletePayflowWorkflow,
  getPayflowWorkflow,
  rejectPayflowWorkflow,
  savePayflowWorkflowDraft,
  submitPayflowWorkflowReview,
  updatePayflowWorkflow,
} from "../../api/payflow";
import { StrategyCanvas } from "../../components/payflow/strategy-canvas";
import {
  Btn,
  Field,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextArea,
  TextInput,
} from "../../components/payflow/lovable/payflow-ui";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import {
  CASE_ACTIONS,
  CHANNELS,
  CONDITION_ATTRIBUTES,
  CONDITION_OPERATORS,
  CONDITION_VALUES,
  MESSAGE_PURPOSES,
  OUTCOMES,
  PAYMENT_ACTIONS,
  REFERENCE_EVENTS,
  TIME_DIRECTIONS,
  TIME_UNITS,
  ensureStepLinks,
  originTone,
  stepConfig,
  strategyStatusTone,
} from "../../lib/strategy-workflow";
import type { PayflowStrategy, PayflowStrategyStep, PayflowStrategyStepConfig } from "../../types";

function findStep(strategy: PayflowStrategy, id: string | null): PayflowStrategyStep | null {
  if (!id) return null;
  return (strategy.steps || []).find((s, i) => (s.id || `s${i + 1}`) === id) || null;
}

export function PayFlowWorkflowDetailPage() {
  const { strategyId } = useParams<{ strategyId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePayFlowAccess();
  const canDelete = hasPermission("delete_workflows");
  const canEdit = hasPermission("create_edit_workflows");
  const [strategy, setStrategy] = useState<PayflowStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftStep, setDraftStep] = useState<PayflowStrategyStep | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      const row = ensureStepLinks(await getPayflowWorkflow(id));
      setStrategy(row);
      const firstId = row.entry_node_id || row.steps?.[0]?.id || null;
      setSelectedId((prev) => prev || firstId);
      const first = findStep(row, firstId) || row.steps?.[0] || null;
      if (first) setDraftStep({ ...first, id: first.id || firstId || "s1" });
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

  function selectStep(id: string) {
    if (!strategy) return;
    const step = findStep(strategy, id);
    if (!step) return;
    setSelectedId(id);
    setDraftStep({ ...step, id, config: { ...(step.config || {}) } });
  }

  function patchConfig(patch: Partial<PayflowStrategyStepConfig>) {
    if (!draftStep) return;
    setDraftStep({
      ...draftStep,
      config: { ...(draftStep.config || {}), ...patch },
      channel: patch.channel !== undefined ? patch.channel : draftStep.channel,
      purpose: patch.purpose !== undefined ? patch.purpose : draftStep.purpose,
    });
  }

  async function applyStepChanges() {
    if (!strategy || !draftStep) return;
    setBusy(true);
    setError("");
    try {
      const next = strategy.steps.map((s, i) => {
        const id = s.id || `s${i + 1}`;
        if (id !== draftStep.id) return s;
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
          steps: next,
          entry_node_id: strategy.entry_node_id || undefined,
        }),
      );
      setStrategy(updated);
      setNotice("Change recorded as Human Modified. Workflow is not activated by editing.");
      const refreshed = findStep(updated, draftStep.id!);
      if (refreshed) setDraftStep({ ...refreshed, id: draftStep.id });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update workflow");
    } finally {
      setBusy(false);
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
      setNotice(typeof success === "function" ? success(updated) : success);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Action failed");
    } finally {
      setBusy(false);
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

  const cfg = useMemo(() => (draftStep ? stepConfig(draftStep) : {}), [draftStep]);
  const conditionValueOptions = CONDITION_VALUES[cfg.attribute || ""] || [];

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
  if (!strategy) return null;

  const segmentEntries = Object.entries(strategy.segment || {}).filter(([, v]) => !!v);
  const isAiProposed = strategy.status === "AI Proposed";
  const isDraft = strategy.status === "Draft";
  const isUnderReview = strategy.status === "Under Review";
  const isApproved = strategy.status === "Approved";
  const isActive = strategy.status === "Active";
  const isInactive = strategy.status === "Inactive";
  const canApprove = canEdit && isUnderReview;
  const canReject = canEdit && (isAiProposed || isUnderReview || isApproved);
  const canActivate = canEdit && (isApproved || (isInactive && !!strategy.approved_by));
  const canDeactivate = canEdit && isActive;
  const canBeginReview = canEdit && isAiProposed;
  const canSubmitReview = canEdit && isDraft;
  const canSaveDraft = canEdit && !isActive;
  const showAiBanner =
    (strategy.source === "AI Generated" || strategy.origin === "AI Proposed") &&
    strategy.status !== "Active";

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
            {canBeginReview && (
              <Btn
                disabled={busy}
                onClick={() =>
                  void runAction(
                    () => beginPayflowWorkflowReview(strategy.id),
                    "Review started — status is now Under Review.",
                  )
                }
              >
                Begin review
              </Btn>
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
                onClick={() =>
                  void runAction(
                    () =>
                      rejectPayflowWorkflow(strategy.id, {
                        note: rejectNote.trim() || undefined,
                      }),
                    "Returned for regeneration. Status reset; AI proposal history is retained.",
                  )
                }
              >
                Reject / Request Regeneration
              </Btn>
            )}
            {canApprove && (
              <Btn
                variant="primary"
                disabled={busy}
                onClick={() =>
                  void runAction(
                    () => approvePayflowWorkflow(strategy.id),
                    (row) =>
                      `Strategy approved${row.approved_by ? ` by ${row.approved_by}` : ""}. Activate it when ready for collection execution.`,
                  )
                }
              >
                Approve Strategy
              </Btn>
            )}
            {canActivate && (
              <Btn
                variant="primary"
                disabled={busy}
                onClick={() =>
                  void runAction(
                    () => activatePayflowWorkflow(strategy.id),
                    "Workflow is now Active for collection execution.",
                  )
                }
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
            {canDelete ? (
              <Btn variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                Delete
              </Btn>
            ) : null}
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

      {showAiBanner && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ai/25 bg-ai/[0.06] px-4 py-3.5">
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              {isAiProposed ? "AI Proposed Strategy" : "AI-generated strategy"}
            </p>
            <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
              PayFlow generated this strategy using portfolio, account, payment and engagement
              context. It cannot become Active until a human reviews and approves it.
            </p>
          </div>
          {(strategy.ai_context || []).length > 0 && (
            <Btn onClick={() => setShowContext((v) => !v)}>
              {showContext ? "Hide reasoning" : "Why PayFlow proposed this"}
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

      {segmentEntries.length > 0 && (
        <Panel
          title="Who this strategy applies to"
          description="Operational and geographic attributes only."
          className="mb-4"
        >
          <div className="flex flex-wrap gap-1.5">
            {segmentEntries.map(([key, value]) => (
              <span
                key={key}
                className="rounded-lg border border-border/70 bg-surface px-2.5 py-1.5 text-[11.5px]"
              >
                <span className="text-muted-foreground">
                  {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}:{" "}
                </span>
                <span className="font-medium text-foreground">{value}</span>
              </span>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel
          title="Strategy flow"
          description="Connected nodes with conditions, waits and outcomes. Select a step to configure it."
          bodyClassName="p-3"
        >
          <StrategyCanvas
            strategy={strategy}
            selectedId={selectedId}
            onSelect={selectStep}
          />
        </Panel>

        <div className="space-y-4">
          {!draftStep ? (
            <Panel title="Step configuration">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Select a step on the canvas to review timing, channel and purpose.
              </p>
            </Panel>
          ) : (
            <Panel title={draftStep.kind} description={draftStep.title}>
              <div className="space-y-3">
                <Field label="Title">
                  <TextInput
                    value={draftStep.title}
                    onChange={(v) => setDraftStep({ ...draftStep, title: v })}
                    disabled={busy || !canEdit || isActive}
                  />
                </Field>

                {draftStep.kind === "Communication" && (
                  <>
                    <Field label="Channel">
                      <SelectInput
                        value={cfg.channel || "Email"}
                        options={CHANNELS}
                        onChange={(v) => patchConfig({ channel: v })}
                      />
                    </Field>
                    <Field label="Purpose">
                      <SelectInput
                        value={cfg.purpose || MESSAGE_PURPOSES[0]!}
                        options={MESSAGE_PURPOSES}
                        onChange={(v) => patchConfig({ purpose: v })}
                      />
                    </Field>
                  </>
                )}

                {(draftStep.kind === "Communication" ||
                  draftStep.kind === "Wait" ||
                  draftStep.kind === "Trigger") && (
                  <>
                    <Field label="Reference event">
                      <SelectInput
                        value={cfg.reference_event || REFERENCE_EVENTS[0]!}
                        options={REFERENCE_EVENTS}
                        onChange={(v) => patchConfig({ reference_event: v })}
                      />
                    </Field>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Amount">
                        <TextInput
                          value={String(cfg.amount ?? 0)}
                          onChange={(v) =>
                            patchConfig({
                              amount: Math.max(0, Number(v.replace(/[^\d.]/g, "")) || 0),
                            })
                          }
                          disabled={busy || !canEdit || isActive}
                        />
                      </Field>
                      <Field label="Unit">
                        <SelectInput
                          value={cfg.unit || "Days"}
                          options={TIME_UNITS}
                          onChange={(v) => patchConfig({ unit: v })}
                        />
                      </Field>
                      <Field label="Direction">
                        <SelectInput
                          value={cfg.direction || "After"}
                          options={TIME_DIRECTIONS}
                          onChange={(v) => patchConfig({ direction: v })}
                        />
                      </Field>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Timing uses an explicit event (e.g. 3 Days After Due Date), never Day N.
                    </p>
                  </>
                )}

                {draftStep.kind === "Condition" && (
                  <>
                    <Field label="Attribute">
                      <SelectInput
                        value={cfg.attribute || CONDITION_ATTRIBUTES[0]!}
                        options={CONDITION_ATTRIBUTES}
                        onChange={(v) =>
                          patchConfig({
                            attribute: v,
                            value: (CONDITION_VALUES[v] || [])[0] || "",
                          })
                        }
                      />
                    </Field>
                    <Field label="Operator">
                      <SelectInput
                        value={cfg.operator || "Equals"}
                        options={CONDITION_OPERATORS}
                        onChange={(v) => patchConfig({ operator: v })}
                      />
                    </Field>
                    <Field label="Value">
                      <SelectInput
                        value={cfg.value || conditionValueOptions[0] || ""}
                        options={conditionValueOptions.length ? conditionValueOptions : [cfg.value || ""]}
                        onChange={(v) => patchConfig({ value: v })}
                      />
                    </Field>
                  </>
                )}

                {draftStep.kind === "Payment Action" && (
                  <Field label="Action">
                    <SelectInput
                      value={cfg.action || PAYMENT_ACTIONS[0]!}
                      options={PAYMENT_ACTIONS}
                      onChange={(v) => patchConfig({ action: v })}
                    />
                  </Field>
                )}

                {draftStep.kind === "Case Action" && (
                  <Field label="Action">
                    <SelectInput
                      value={cfg.action || CASE_ACTIONS[0]!}
                      options={CASE_ACTIONS}
                      onChange={(v) => patchConfig({ action: v })}
                    />
                  </Field>
                )}

                {draftStep.kind === "Outcome" && (
                  <Field label="Outcome">
                    <SelectInput
                      value={cfg.outcome || OUTCOMES[0]!}
                      options={OUTCOMES}
                      onChange={(v) => patchConfig({ outcome: v })}
                    />
                  </Field>
                )}

                {(draftStep.kind === "Human Review" || draftStep.kind === "AI Reassessment") && (
                  <Field label="Note">
                    <TextArea
                      value={cfg.note || draftStep.detail || ""}
                      onChange={(v) => patchConfig({ note: v })}
                      placeholder="Guidance for this step"
                    />
                  </Field>
                )}

                {canEdit && !isActive && (
                  <div className="flex flex-wrap gap-2">
                    {draftStep.kind !== "Trigger" && (
                      <Btn
                        disabled={busy}
                        onClick={() =>
                          setDraftStep({ ...draftStep, disabled: !draftStep.disabled })
                        }
                      >
                        {draftStep.disabled ? "Enable step" : "Disable step"}
                      </Btn>
                    )}
                    <Btn variant="primary" disabled={busy} onClick={() => void applyStepChanges()}>
                      Apply step changes
                    </Btn>
                  </div>
                )}
              </div>
            </Panel>
          )}

          <Panel
            title="Approval & versions"
            action={
              <Btn onClick={() => setShowAudit((v) => !v)}>
                {showAudit ? "Hide" : "View history"}
              </Btn>
            }
          >
            <dl className="space-y-1.5 text-[12.5px]">
              {[
                ["Source", strategy.source || "—"],
                ["Origin", strategy.origin],
                ["Human Modified", strategy.human_modified || strategy.origin === "Human Modified" ? "Yes" : "No"],
                ["Reviewed By", strategy.reviewed_by || "—"],
                ["Approved By", strategy.approved_by || "Not yet approved"],
                ["Approval Date", strategy.approval_date || "—"],
                ["Strategy Version", `v${strategy.version}`],
                [
                  "Coverage",
                  strategy.cases_covered != null
                    ? `${strategy.cases_covered.toLocaleString()} cases`
                    : strategy.coverage || "—",
                ],
              ].map(([label, value]) => (
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
            {showAudit && (
              <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
                {(strategy.versions || []).length === 0 ? (
                  <li className="text-[11.5px] text-muted-foreground">No version history yet.</li>
                ) : (
                  (strategy.versions || []).map((v, i) => (
                    <li key={`${v.version}-${i}`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[12.5px] font-semibold text-foreground">
                          v{v.version}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{v.date}</span>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground">{v.note}</p>
                      {(v.changes || []).length > 0 && (
                        <ul className="mt-1 list-inside list-disc text-[11px] text-muted-foreground">
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

          {canReject && (
            <Panel title="Request regeneration">
              <Field label="Note for PayFlow" hint="Optional. Explain what should change.">
                <TextArea
                  value={rejectNote}
                  onChange={setRejectNote}
                  placeholder="e.g. reduce contact volume for low balances"
                />
              </Field>
            </Panel>
          )}
        </div>
      </div>

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
