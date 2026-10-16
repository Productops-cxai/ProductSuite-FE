import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  createPayflowWorkflow,
  listPayflowClientPortfolios,
  listPayflowClients,
  listPayflowWorkflows,
  suggestPayflowWorkflows,
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
import {
  CHANNELS,
  MESSAGE_PURPOSES,
  TIME_UNITS,
  buildStepsFromDraft,
  draftStepTitle,
  makeDraftStep,
  suggestFromPrompt,
  type DraftStep,
  type DraftStepKind,
} from "../../lib/strategy-workflow";
import type {
  PayflowClient,
  PayflowPortfolio,
  PayflowStrategy,
  PayflowStrategyCatalog,
} from "../../types";

const ADDABLE_KINDS: DraftStepKind[] = [
  "Communication",
  "Wait",
  "Condition",
  "AI Reassessment",
  "Case Action",
  "Payment Action",
  "Human Review",
];

const AGE_BANDS = ["All ages", "18 – 24", "25 – 34", "35 – 49", "50 – 64", "65 and over"];
const POSTAL_REGIONS = [
  "All regions",
  "Ontario (M, L, K, N, P)",
  "Quebec (H, J, G)",
  "British Columbia (V)",
  "Alberta (T)",
  "Atlantic (A, B, C, E)",
  "Prairies (R, S)",
];
const BALANCE_BANDS = [
  "All balances",
  "Under $500",
  "$500 – $1,500",
  "$1,500 – $5,000",
  "$5,000 and over",
];
const DELINQUENCY_BANDS = [
  "All stages",
  "1 – 29 days past due",
  "30 – 59 days past due",
  "60 – 89 days past due",
  "90+ days past due",
];
const LANGUAGES = ["All languages", "English", "French", "English + French"];
const TENURES = [
  "All customers",
  "New customer (under 6 months)",
  "Established (6 – 24 months)",
  "Long-standing (2 years+)",
];

export function PayFlowWorkflowNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [portfolios, setPortfolios] = useState<PayflowPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [prompt, setPrompt] = useState("");
  const [clientId, setClientId] = useState(searchParams.get("clientId") || "");
  const [portfolioId, setPortfolioId] = useState(searchParams.get("portfolioId") || "");
  const [addKind, setAddKind] = useState<DraftStepKind>("Communication");
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [catalog, setCatalog] = useState<PayflowStrategyCatalog | null>(null);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [segment, setSegment] = useState({
    age_band: AGE_BANDS[0]!,
    postal_region: POSTAL_REGIONS[0]!,
    balance_band: BALANCE_BANDS[0]!,
    delinquency: DELINQUENCY_BANDS[0]!,
    language: LANGUAGES[0]!,
    tenure: TENURES[0]!,
  });

  const ageBands = catalog?.age_bands?.length ? catalog.age_bands : AGE_BANDS;
  const postalRegions = catalog?.postal_regions?.length
    ? catalog.postal_regions
    : POSTAL_REGIONS;
  const balanceBands = catalog?.balance_bands?.length ? catalog.balance_bands : BALANCE_BANDS;
  const delinquencyBands = catalog?.delinquency_bands?.length
    ? catalog.delinquency_bands
    : DELINQUENCY_BANDS;
  const languages =
    catalog?.language_preferences?.length || catalog?.languages?.length
      ? catalog.language_preferences || catalog.languages || LANGUAGES
      : LANGUAGES;
  const tenures =
    catalog?.tenure_bands?.length || catalog?.tenures?.length
      ? catalog.tenure_bands || catalog.tenures || TENURES
      : TENURES;
  const timeUnits = catalog?.time_units?.length ? catalog.time_units : TIME_UNITS;
  const channels = catalog?.channels?.length ? catalog.channels : CHANNELS;
  const purposes = catalog?.message_purposes?.length
    ? catalog.message_purposes
    : MESSAGE_PURPOSES;

  useEffect(() => {
    let cancelled = false;
    Promise.all([listPayflowClients({}), listPayflowWorkflows({}).catch(() => null)])
      .then(([res, wf]) => {
        if (cancelled) return;
        const list = res.clients || [];
        setClients(list);
        if (!clientId && list[0]) setClientId(String(list[0].id));
        if (wf?.catalog) setCatalog(wf.catalog);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load clients");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) {
      setPortfolios([]);
      setPortfolioId("");
      return;
    }
    let cancelled = false;
    const preferred = searchParams.get("portfolioId");
    listPayflowClientPortfolios(id)
      .then((res) => {
        if (cancelled) return;
        const list = res.portfolios || [];
        setPortfolios(list);
        if (preferred && list.some((p) => String(p.id) === preferred)) {
          setPortfolioId(preferred);
        } else {
          setPortfolioId(list[0] ? String(list[0].id) : "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPortfolios([]);
          setPortfolioId("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, searchParams]);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ label: c.name, value: String(c.id) })),
    [clients],
  );
  const portfolioOptions = useMemo(
    () => portfolios.map((p) => ({ label: p.name, value: String(p.id) })),
    [portfolios],
  );

  const previewStrategy: PayflowStrategy | null = useMemo(() => {
    if (!steps.length) return null;
    const built = buildStepsFromDraft(steps);
    return {
      id: 0,
      code: "preview",
      name: name || "Preview",
      client_id: Number(clientId) || 0,
      status: "Draft",
      origin: "Human Created",
      source: "Human Created",
      version: 1,
      segment,
      entry_node_id: "t1",
      steps: built,
      stats: {
        steps: built.length,
        branches: built.filter((s) => s.kind === "Condition").length,
        emails: built.filter(
          (s) => s.kind === "Communication" && (s.config?.channel || s.channel) === "Email",
        ).length,
        sms: built.filter(
          (s) => s.kind === "Communication" && (s.config?.channel || s.channel) === "SMS",
        ).length,
      },
      ai_context: [],
      versions: [],
    };
  }, [steps, name, clientId, segment]);

  function patchStep(id: string, patch: Partial<DraftStep>) {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return { ...s, ...patch };
      }),
    );
  }

  function moveStep(id: string, dir: -1 | 1) {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item!);
      return copy;
    });
  }

  function reorderByDrag(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setSteps((prev) => {
      const from = prev.findIndex((s) => s.id === dragId);
      const to = prev.findIndex((s) => s.id === targetId);
      if (from < 0 || to < 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item!);
      return copy;
    });
  }

  async function runAiSuggest() {
    setError("");
    const cid = Number(clientId);
    const pid = Number(portfolioId);
    if (Number.isFinite(cid) && cid > 0 && Number.isFinite(pid) && pid > 0) {
      setSuggestBusy(true);
      try {
        const res = await suggestPayflowWorkflows({
          client_id: cid,
          portfolio_id: pid,
        });
        const first = res.workflows?.[0];
        if (first?.id) {
          navigate(`/payflow/workflows/${first.id}`);
          return;
        }
        setSteps(suggestFromPrompt(prompt));
        setError("");
      } catch (err) {
        setSteps(suggestFromPrompt(prompt));
        setError(
          err instanceof ApiError
            ? `${err.detail} — using local step suggestions instead.`
            : "AI suggest unavailable — using local step suggestions.",
        );
      } finally {
        setSuggestBusy(false);
      }
      return;
    }
    setSteps(suggestFromPrompt(prompt));
  }

  const tipChips = useMemo(() => {
    const tips: string[] = [];
    if (segment.balance_band.toLowerCase().includes("under") || segment.balance_band.includes("500")) {
      tips.push("Prefer SMS for small balances");
    }
    if (segment.delinquency.includes("90")) {
      tips.push("Escalate sooner for 90+ days");
    }
    if (segment.language.toLowerCase().includes("french")) {
      tips.push("Use French-capable templates");
    }
    if (!tips.length) tips.push("Gentle early reminder", "Offer payment plan if no response");
    return tips;
  }, [segment]);

  async function createWorkflow() {
    setError("");
    if (!name.trim()) {
      setError("Give the workflow a name.");
      return;
    }
    if (!clientId) {
      setError("Select a client.");
      return;
    }
    if (!portfolioId) {
      setError("Select a portfolio. Every workflow must be scoped to a client and portfolio.");
      return;
    }
    if (steps.length === 0) {
      setError("Add at least one step.");
      return;
    }
    setBusy(true);
    try {
      const built = buildStepsFromDraft(steps);
      const created = await createPayflowWorkflow({
        name: name.trim(),
        client_id: Number(clientId),
        portfolio_id: Number(portfolioId),
        summary: summary.trim() || "Human-created workflow with optional AI assistance.",
        coverage: "Targeted segment",
        segment,
        steps: built,
        entry_node_id: "t1",
        status: "Draft",
        source: "Human Created",
      });
      navigate(`/payflow/workflows/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create workflow");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Strategies / Workflows", to: "/payflow/workflows" },
          { label: "Create workflow" },
        ]}
        title="Create a workflow"
        description="Describe what you want and let PayFlow AI suggest a starting flow, or add the steps yourself. New workflows save as Draft until you submit them for review."
      />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel title="Workflow details">
            <div className="space-y-3">
              <Field label="Workflow name">
                <TextInput
                  value={name}
                  onChange={setName}
                  placeholder="e.g. Early Reminder — Small Balances"
                />
              </Field>
              <Field label="Client">
                <SelectInput
                  value={clientOptions.find((c) => c.value === clientId)?.label || ""}
                  options={clientOptions.map((c) => c.label)}
                  onChange={(label) => {
                    const match = clientOptions.find((c) => c.label === label);
                    if (match) setClientId(match.value);
                  }}
                />
              </Field>
              <Field label="Sub-client / Portfolio">
                <SelectInput
                  value={portfolioOptions.find((p) => p.value === portfolioId)?.label || ""}
                  options={
                    portfolioOptions.length
                      ? portfolioOptions.map((p) => p.label)
                      : ["No portfolios"]
                  }
                  onChange={(label) => {
                    const match = portfolioOptions.find((p) => p.label === label);
                    if (match) setPortfolioId(match.value);
                  }}
                />
              </Field>
              <Field label="What this workflow is for">
                <TextArea
                  value={summary}
                  onChange={setSummary}
                  placeholder="e.g. early email reminder for smaller balances"
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Who it applies to" description="Operational and geographic attributes only.">
            <div className="space-y-3">
              <Field label="Age band">
                <SelectInput
                  value={segment.age_band}
                  options={ageBands}
                  onChange={(v) => setSegment((s) => ({ ...s, age_band: v }))}
                />
              </Field>
              <Field label="Postal region">
                <SelectInput
                  value={segment.postal_region}
                  options={postalRegions}
                  onChange={(v) => setSegment((s) => ({ ...s, postal_region: v }))}
                />
              </Field>
              <Field label="Balance band">
                <SelectInput
                  value={segment.balance_band}
                  options={balanceBands}
                  onChange={(v) => setSegment((s) => ({ ...s, balance_band: v }))}
                />
              </Field>
              <Field label="Delinquency stage">
                <SelectInput
                  value={segment.delinquency}
                  options={delinquencyBands}
                  onChange={(v) => setSegment((s) => ({ ...s, delinquency: v }))}
                />
              </Field>
              <Field label="Language preference">
                <SelectInput
                  value={segment.language}
                  options={languages}
                  onChange={(v) => setSegment((s) => ({ ...s, language: v }))}
                />
              </Field>
              <Field label="Customer tenure">
                <SelectInput
                  value={segment.tenure}
                  options={tenures}
                  onChange={(v) => setSegment((s) => ({ ...s, tenure: v }))}
                />
              </Field>
              <p className="text-[11.5px] text-muted-foreground">
                Excluded from targeting:{" "}
                {(catalog?.excluded_targeting_attributes || []).length
                  ? catalog!.excluded_targeting_attributes!.join(", ")
                  : "ethnicity, religion, gender, health status, marital status"}
                .
              </p>
            </div>
          </Panel>

          <Panel
            title="Ask PayFlow AI"
            description="With client + portfolio selected, PayFlow AI proposes governed workflows. Otherwise local step suggestions are used from your prompt."
            action={<StatusPill tone="ai">AI assist</StatusPill>}
          >
            <Field label="Your prompt">
              <TextArea
                value={prompt}
                onChange={setPrompt}
                placeholder="e.g. gentle SMS-first reminder for small balances, offer an installment plan if there is no payment after a week"
              />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tipChips.map((tip) => (
                <button
                  key={tip}
                  type="button"
                  className="rounded-full border border-ai/25 bg-ai/[0.06] px-2.5 py-1 text-[11px] text-foreground hover:border-ai/50"
                  onClick={() => setPrompt((p) => (p ? `${p}. ${tip}` : tip))}
                >
                  {tip}
                </button>
              ))}
            </div>
            <Btn
              className="mt-2"
              variant="primary"
              disabled={suggestBusy}
              onClick={() => void runAiSuggest()}
            >
              {suggestBusy
                ? "Asking PayFlow AI…"
                : steps.length
                  ? "Re-suggest steps"
                  : "Suggest steps"}
            </Btn>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title="Build the steps"
            description="Drag to reorder, or use ↑ ↓. A condition splits YES (paid) and NO (continue). Timing uses an amount + unit after a reference event."
            action={
              <div className="flex items-end gap-2">
                <SelectInput
                  value={addKind}
                  options={ADDABLE_KINDS}
                  onChange={(v) => setAddKind(v as DraftStepKind)}
                />
                <Btn
                  onClick={() => {
                    setSteps((prev) => [...prev, makeDraftStep(addKind)]);
                    setError("");
                  }}
                >
                  Add
                </Btn>
              </div>
            }
          >
            {steps.length === 0 ? (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                No steps yet. Describe what you want in “Ask PayFlow AI”, or add steps here.
              </p>
            ) : (
              <ul className="space-y-2">
                {steps.map((step, i) => (
                  <li
                    key={step.id}
                    draggable
                    onDragStart={() => setDragId(step.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      reorderByDrag(step.id);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={`cursor-grab rounded-xl border border-border bg-card px-3 py-2.5 shadow-subtle active:cursor-grabbing ${
                      dragId === step.id ? "opacity-60 ring-2 ring-primary/30" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground" title="Drag to reorder">
                        ⋮⋮ {i + 1}
                      </span>
                      <StatusPill>{step.kind}</StatusPill>
                      <span className="truncate text-[12.5px] font-medium text-foreground">
                        {draftStepTitle(step)}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        <Btn disabled={i === 0} onClick={() => moveStep(step.id, -1)}>
                          ↑
                        </Btn>
                        <Btn
                          disabled={i === steps.length - 1}
                          onClick={() => moveStep(step.id, 1)}
                        >
                          ↓
                        </Btn>
                        <Btn
                          variant="danger"
                          onClick={() =>
                            setSteps((prev) => prev.filter((s) => s.id !== step.id))
                          }
                        >
                          Remove
                        </Btn>
                      </div>
                    </div>
                    {step.kind === "Communication" && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <Field label="Channel">
                          <SelectInput
                            value={step.channel || "Email"}
                            options={channels}
                            onChange={(v) => patchStep(step.id, { channel: v })}
                          />
                        </Field>
                        <Field label="Message purpose">
                          <SelectInput
                            value={step.purpose || purposes[0]!}
                            options={purposes}
                            onChange={(v) => patchStep(step.id, { purpose: v })}
                          />
                        </Field>
                        <Field label="Amount after previous">
                          <TextInput
                            value={String(step.amount)}
                            onChange={(v) =>
                              patchStep(step.id, {
                                amount: Math.max(0, Number(v.replace(/\D/g, "")) || 0),
                              })
                            }
                          />
                        </Field>
                      </div>
                    )}
                    {step.kind === "Wait" && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <Field label="Wait amount">
                          <TextInput
                            value={String(step.amount)}
                            onChange={(v) =>
                              patchStep(step.id, {
                                amount: Math.max(0, Number(v.replace(/\D/g, "")) || 0),
                              })
                            }
                          />
                        </Field>
                        <Field label="Unit">
                          <SelectInput
                            value={step.unit || "Days"}
                            options={timeUnits}
                            onChange={(v) => patchStep(step.id, { unit: v })}
                          />
                        </Field>
                      </div>
                    )}
                    {step.kind === "Condition" && (
                      <p className="mt-2 text-[11.5px] text-muted-foreground">
                        Checks whether payment was received. YES closes the case as paid; NO
                        continues with the steps below.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {previewStrategy && (
            <Panel title="Flow preview" description="How the workflow will look in the builder.">
              <StrategyCanvas
                strategy={previewStrategy}
                selectedId={null}
                onSelect={() => undefined}
              />
            </Panel>
          )}

          <Panel
            title="Create"
            description="Saved as Draft. Submit for review, then approve, then activate — AI Proposed and Draft workflows cannot become Active."
            action={
              <Btn variant="primary" disabled={busy} onClick={() => void createWorkflow()}>
                {busy ? "Creating…" : "Create workflow"}
              </Btn>
            }
          >
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">
                {error}
              </p>
            )}
            {!error && (
              <p className="text-[12.5px] text-muted-foreground">
                {steps.length
                  ? `${steps.length} step${steps.length === 1 ? "" : "s"} ready (+ Trigger).`
                  : "Add or suggest steps to continue."}
              </p>
            )}
            {clients.length === 0 && (
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                No clients available.{" "}
                <Link to="/payflow/clients" className="text-primary hover:underline">
                  Create a client
                </Link>{" "}
                first.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
