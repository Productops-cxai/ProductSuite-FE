import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  approvePayflowWorkflow,
  getPayflowWorkflow,
  rejectPayflowWorkflow,
  savePayflowWorkflowDraft,
  updatePayflowWorkflow,
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
import type { PayflowStrategy, PayflowStrategyStep } from "../../types";

const CHANNELS = ["Email", "SMS"];
const PURPOSES = [
  "Payment Reminder",
  "Promise-to-Pay Follow-Up",
  "Payment Plan Offer",
  "Final Notice",
  "Hardship Outreach",
];

function strategyStatusTone(status: string): Tone {
  switch (status) {
    case "AI Proposed":
      return "ai";
    case "Under Review":
      return "warning";
    case "Approved":
      return "info";
    case "Active":
      return "success";
    default:
      return "neutral";
  }
}

function stepTone(kind: string): Tone {
  switch (kind) {
    case "Communication":
      return "info";
    case "Condition":
      return "warning";
    case "AI Reassessment":
      return "ai";
    case "Human Review":
      return "danger";
    case "Outcome":
      return "success";
    default:
      return "neutral";
  }
}

export function PayFlowWorkflowDetailPage() {
  const { strategyId } = useParams<{ strategyId: string }>();
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
      const row = await getPayflowWorkflow(id);
      setStrategy(row);
      const firstId = row.steps?.[0]?.id || (row.steps?.[0] ? "step-0" : null);
      setSelectedId((prev) => prev || firstId);
      const first = row.steps?.[0] || null;
      if (first) setDraftStep({ ...first, id: first.id || "step-0" });
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

  function selectStep(step: PayflowStrategyStep, index: number) {
    const id = step.id || `step-${index}`;
    setSelectedId(id);
    setDraftStep({ ...step, id });
  }

  async function applyStepChanges() {
    if (!strategy || !draftStep) return;
    setBusy(true);
    setError("");
    try {
      const next = strategy.steps.map((s, i) => {
        const id = s.id || `step-${i}`;
        return id === draftStep.id ? { ...draftStep } : s;
      });
      const updated = await updatePayflowWorkflow(strategy.id, { steps: next });
      setStrategy(updated);
      setNotice("Change recorded as Human Modified.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update workflow");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDraft() {
    if (!strategy) return;
    setBusy(true);
    try {
      setStrategy(await savePayflowWorkflowDraft(strategy.id));
      setNotice("Draft saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Save draft failed");
    } finally {
      setBusy(false);
    }
  }

  async function onApprove() {
    if (!strategy) return;
    setBusy(true);
    try {
      const updated = await approvePayflowWorkflow(strategy.id);
      setStrategy(updated);
      setNotice(`Strategy approved${updated.approved_by ? ` by ${updated.approved_by}` : ""} and is now active.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!strategy) return;
    setBusy(true);
    try {
      setStrategy(
        await rejectPayflowWorkflow(strategy.id, {
          note: rejectNote.trim() || undefined,
        }),
      );
      setNotice("Regeneration requested. PayFlow will propose a revised strategy.");
      setRejectNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Reject failed");
    } finally {
      setBusy(false);
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
  if (!strategy) return null;

  const segmentEntries = Object.entries(strategy.segment || {}).filter(([, v]) => !!v);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Strategies / Workflows", to: "/payflow/workflows" },
          { label: strategy.client_name || "Client" },
          ...(strategy.portfolio_name ? [{ label: strategy.portfolio_name }] : []),
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
            <Btn disabled={busy} onClick={() => void onSaveDraft()}>
              Save Draft
            </Btn>
            <Btn variant="danger" disabled={busy} onClick={() => void onReject()}>
              Reject / Request Regeneration
            </Btn>
            <Btn variant="primary" disabled={busy} onClick={() => void onApprove()}>
              Approve Strategy
            </Btn>
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

      {strategy.origin === "AI Proposed" && strategy.status !== "Active" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ai/25 bg-ai/[0.06] px-4 py-3.5">
          <div>
            <p className="text-[13px] font-semibold text-foreground">AI Proposed Strategy</p>
            <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
              PayFlow generated this strategy using portfolio, account, payment and engagement
              context. Review each step, adjust what needs changing, then approve.
            </p>
          </div>
          <Btn onClick={() => setShowContext((v) => !v)}>
            {showContext ? "Hide reasoning" : "Why PayFlow proposed this"}
          </Btn>
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

      <div className="grid gap-4 xl:grid-cols-[1fr_310px]">
        <Panel
          title="Strategy flow"
          description="Select a step to review its configuration."
          bodyClassName="p-3"
        >
          <ol className="space-y-2">
            {(strategy.steps || []).map((step, i) => {
              const id = step.id || `step-${i}`;
              const active = id === selectedId;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => selectStep(step, i)}
                    className={
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors " +
                      (active
                        ? "border-primary/40 bg-primary/[0.06]"
                        : "border-border/80 bg-card hover:border-primary/25") +
                      (step.disabled ? " opacity-50" : "")
                    }
                  >
                    <span className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill tone={stepTone(step.kind)}>{step.kind}</StatusPill>
                        {step.channel && <StatusPill>{step.channel}</StatusPill>}
                        {step.disabled && <StatusPill tone="danger">Disabled</StatusPill>}
                      </div>
                      <p className="mt-1 truncate text-[13px] font-medium text-foreground">
                        {step.title}
                      </p>
                      {(step.timing || step.detail) && (
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {[step.timing, step.detail].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </Panel>

        <div className="space-y-4">
          {!draftStep ? (
            <Panel title="Step configuration">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Select a step on the left to review timing, channel and purpose.
              </p>
            </Panel>
          ) : (
            <Panel title={draftStep.kind} description={draftStep.title}>
              <div className="space-y-3">
                <Field label="Title">
                  <TextInput
                    value={draftStep.title}
                    onChange={(v) => setDraftStep({ ...draftStep, title: v })}
                    disabled={busy}
                  />
                </Field>
                {draftStep.kind === "Communication" && (
                  <>
                    <Field label="Channel">
                      <SelectInput
                        value={draftStep.channel || "Email"}
                        options={CHANNELS}
                        onChange={(v) => setDraftStep({ ...draftStep, channel: v })}
                      />
                    </Field>
                    <Field label="Purpose">
                      <SelectInput
                        value={draftStep.purpose || PURPOSES[0]}
                        options={PURPOSES}
                        onChange={(v) => setDraftStep({ ...draftStep, purpose: v })}
                      />
                    </Field>
                  </>
                )}
                <Field label="Timing">
                  <TextInput
                    value={draftStep.timing || ""}
                    onChange={(v) => setDraftStep({ ...draftStep, timing: v })}
                    placeholder="e.g. Day 0 · 48 Hours After"
                    disabled={busy}
                  />
                </Field>
                <Field label="Detail">
                  <TextArea
                    value={draftStep.detail || ""}
                    onChange={(v) => setDraftStep({ ...draftStep, detail: v })}
                    placeholder="Optional step notes"
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Btn
                    disabled={busy}
                    onClick={() =>
                      setDraftStep({ ...draftStep, disabled: !draftStep.disabled })
                    }
                  >
                    {draftStep.disabled ? "Mark enabled" : "Mark disabled"}
                  </Btn>
                  <Btn variant="primary" disabled={busy} onClick={() => void applyStepChanges()}>
                    Apply step changes
                  </Btn>
                </div>
              </div>
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
              {[
                ["Origin", strategy.origin],
                ["Approved By", strategy.approved_by || "Not yet approved"],
                ["Approval Date", strategy.approval_date || "—"],
                ["Strategy Version", `v${strategy.version}`],
                ["Coverage", strategy.coverage || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            {showAudit && (
              <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
                {(strategy.versions || []).map((v, i) => (
                  <li key={`${v.version}-${i}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] font-semibold text-foreground">
                        v{v.version}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{v.date}</span>
                    </div>
                    <p className="text-[11.5px] text-muted-foreground">{v.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Request regeneration">
            <Field label="Note for PayFlow" hint="Optional. Explain what should change.">
              <TextArea
                value={rejectNote}
                onChange={setRejectNote}
                placeholder="e.g. reduce contact volume for low balances"
              />
            </Field>
          </Panel>
        </div>
      </div>
    </>
  );
}
