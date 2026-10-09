import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  createPayflowWorkflow,
  listPayflowClientPortfolios,
  listPayflowClients,
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
} from "../../components/payflow/lovable/payflow-ui";
import type { PayflowClient, PayflowPortfolio } from "../../types";

type StepKind =
  | "Communication"
  | "Wait"
  | "Condition"
  | "AI Reassessment"
  | "Case Action"
  | "Human Review";

type DraftStep = {
  id: string;
  kind: StepKind;
  title: string;
  channel?: string;
  purpose?: string;
  timing?: string;
  detail?: string;
};

const ADDABLE_KINDS: StepKind[] = [
  "Communication",
  "Wait",
  "Condition",
  "AI Reassessment",
  "Case Action",
  "Human Review",
];

const CHANNELS = ["Email", "SMS"];
const PURPOSES = [
  "Payment Reminder",
  "Promise-to-Pay Follow-Up",
  "Payment Plan Offer",
  "Final Notice",
  "Hardship Outreach",
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

function uid() {
  return `s${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

function makeStep(kind: StepKind): DraftStep {
  if (kind === "Communication") {
    return {
      id: uid(),
      kind,
      title: "Send Email — Payment Reminder",
      channel: "Email",
      purpose: PURPOSES[0],
      timing: "0 Days After previous",
    };
  }
  if (kind === "Wait") {
    return { id: uid(), kind, title: "Wait / observe", timing: "3 Days" };
  }
  if (kind === "Condition") {
    return {
      id: uid(),
      kind,
      title: "Payment received?",
      detail: "YES closes as paid; NO continues",
    };
  }
  if (kind === "AI Reassessment") {
    return { id: uid(), kind, title: "AI reassessment" };
  }
  if (kind === "Case Action") {
    return { id: uid(), kind, title: "Case action" };
  }
  return { id: uid(), kind, title: "Human review" };
}

function stepTitle(step: DraftStep) {
  if (step.kind === "Communication") {
    return `Send ${step.channel || "Email"} — ${step.purpose || PURPOSES[0]}`;
  }
  return step.title;
}

function suggestFromPrompt(prompt: string): DraftStep[] {
  const p = prompt.toLowerCase();
  const gentle = /gentle|soft|early|gradual|remind/.test(p);
  const urgent = /urgent|fast|aggressive|escalat|final|late|overdue/.test(p);
  const smsFirst = /sms|text|mobile/.test(p);
  const wantsPlan = /plan|installment|instalment|arrangement|afford/.test(p);
  const wantsReview = /review|supervisor|approval|sensitive/.test(p);

  const first = makeStep("Communication");
  first.channel = smsFirst ? "SMS" : "Email";
  first.purpose = PURPOSES[0];
  first.timing = urgent ? "0 Days" : "1 Day After";
  first.title = stepTitle(first);

  const wait = makeStep("Wait");
  wait.timing = urgent ? "2 Days" : gentle ? "5 Days" : "3 Days";
  wait.title = `Wait ${wait.timing}`;

  const check = makeStep("Condition");

  const second = makeStep("Communication");
  second.channel = smsFirst ? "Email" : "SMS";
  second.purpose = wantsPlan ? "Payment Plan Offer" : PURPOSES[1] || PURPOSES[0];
  second.timing = urgent ? "1 Day After" : "3 Days After";
  second.title = stepTitle(second);

  const steps: DraftStep[] = [first, wait, check, second, makeStep("AI Reassessment")];
  if (urgent) {
    const finalNotice = makeStep("Communication");
    finalNotice.channel = "Email";
    finalNotice.purpose = "Final Notice";
    finalNotice.timing = "5 Days After";
    finalNotice.title = stepTitle(finalNotice);
    steps.push(finalNotice);
  }
  if (wantsReview) steps.push(makeStep("Human Review"));
  return steps;
}

export function PayFlowWorkflowNewPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [portfolios, setPortfolios] = useState<PayflowPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [prompt, setPrompt] = useState("");
  const [clientId, setClientId] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [addKind, setAddKind] = useState<StepKind>("Communication");
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [segment, setSegment] = useState({
    age_band: AGE_BANDS[0],
    postal_region: POSTAL_REGIONS[0],
    balance_band: BALANCE_BANDS[0],
    delinquency: DELINQUENCY_BANDS[0],
    language: LANGUAGES[0],
    tenure: TENURES[0],
  });

  useEffect(() => {
    let cancelled = false;
    listPayflowClients({})
      .then((res) => {
        if (cancelled) return;
        const list = res.clients || [];
        setClients(list);
        if (list[0]) setClientId(String(list[0].id));
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
  }, []);

  useEffect(() => {
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) {
      setPortfolios([]);
      setPortfolioId("");
      return;
    }
    let cancelled = false;
    listPayflowClientPortfolios(id)
      .then((res) => {
        if (cancelled) return;
        const list = res.portfolios || [];
        setPortfolios(list);
        setPortfolioId(list[0] ? String(list[0].id) : "");
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
  }, [clientId]);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ label: c.name, value: String(c.id) })),
    [clients],
  );
  const portfolioOptions = useMemo(
    () => portfolios.map((p) => ({ label: p.name, value: String(p.id) })),
    [portfolios],
  );

  function patchStep(id: string, patch: Partial<DraftStep>) {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        if (next.kind === "Communication") next.title = stepTitle(next);
        return next;
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
    if (steps.length === 0) {
      setError("Add at least one step.");
      return;
    }
    setBusy(true);
    try {
      const created = await createPayflowWorkflow({
        name: name.trim(),
        client_id: Number(clientId),
        portfolio_id: portfolioId ? Number(portfolioId) : null,
        summary: summary.trim() || "Human-created workflow with AI assistance.",
        coverage: "Targeted segment",
        segment,
        steps: steps.map((s) => ({
          id: s.id,
          kind: s.kind,
          title: s.title,
          channel: s.channel,
          purpose: s.purpose,
          timing: s.timing,
          detail: s.detail,
        })),
        status: "Under Review",
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
        description="Describe what you want and let PayFlow AI suggest a starting flow, or add the steps yourself and reorder them."
      />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel title="Workflow details">
            <div className="space-y-3">
              <Field label="Workflow name">
                <TextInput
                  value={name}
                  onChange={setName}
                  placeholder="e.g. PayPal Loans Early Reminder"
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
                  options={AGE_BANDS}
                  onChange={(v) => setSegment((s) => ({ ...s, age_band: v }))}
                />
              </Field>
              <Field label="Postal region">
                <SelectInput
                  value={segment.postal_region}
                  options={POSTAL_REGIONS}
                  onChange={(v) => setSegment((s) => ({ ...s, postal_region: v }))}
                />
              </Field>
              <Field label="Balance band">
                <SelectInput
                  value={segment.balance_band}
                  options={BALANCE_BANDS}
                  onChange={(v) => setSegment((s) => ({ ...s, balance_band: v }))}
                />
              </Field>
              <Field label="Delinquency stage">
                <SelectInput
                  value={segment.delinquency}
                  options={DELINQUENCY_BANDS}
                  onChange={(v) => setSegment((s) => ({ ...s, delinquency: v }))}
                />
              </Field>
              <Field label="Language preference">
                <SelectInput
                  value={segment.language}
                  options={LANGUAGES}
                  onChange={(v) => setSegment((s) => ({ ...s, language: v }))}
                />
              </Field>
              <Field label="Customer tenure">
                <SelectInput
                  value={segment.tenure}
                  options={TENURES}
                  onChange={(v) => setSegment((s) => ({ ...s, tenure: v }))}
                />
              </Field>
              <p className="text-[11.5px] text-muted-foreground">
                Excluded from targeting: race, ethnicity, gender, religion, disability, national
                origin.
              </p>
            </div>
          </Panel>

          <Panel
            title="Ask PayFlow AI"
            description="Describe the outcome you want. AI suggests the steps; you stay in control."
            action={<StatusPill tone="ai">AI</StatusPill>}
          >
            <Field label="Your prompt">
              <TextArea
                value={prompt}
                onChange={setPrompt}
                placeholder="e.g. gentle SMS-first reminder for small balances, offer an installment plan if there is no payment after a week"
              />
            </Field>
            <Btn
              className="mt-2"
              variant="primary"
              onClick={() => {
                setSteps(suggestFromPrompt(prompt));
                setError("");
              }}
            >
              {steps.length ? "Re-suggest steps" : "Suggest steps"}
            </Btn>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title="Build the steps"
            description="Use ↑ ↓ to reorder. A condition splits the flow into a YES and a NO path."
            action={
              <div className="flex items-end gap-2">
                <SelectInput
                  value={addKind}
                  options={ADDABLE_KINDS}
                  onChange={(v) => setAddKind(v as StepKind)}
                />
                <Btn
                  onClick={() => {
                    setSteps((prev) => [...prev, makeStep(addKind)]);
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
                    className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-subtle"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground">{i + 1}</span>
                      <StatusPill>{step.kind}</StatusPill>
                      <span className="truncate text-[12.5px] font-medium text-foreground">
                        {step.title}
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
                            options={CHANNELS}
                            onChange={(v) => patchStep(step.id, { channel: v })}
                          />
                        </Field>
                        <Field label="Message purpose">
                          <SelectInput
                            value={step.purpose || PURPOSES[0]}
                            options={PURPOSES}
                            onChange={(v) => patchStep(step.id, { purpose: v })}
                          />
                        </Field>
                        <Field label="Timing">
                          <TextInput
                            value={step.timing || ""}
                            onChange={(v) => patchStep(step.id, { timing: v })}
                          />
                        </Field>
                      </div>
                    )}
                    {step.kind === "Wait" && (
                      <div className="mt-2">
                        <Field label="Wait for">
                          <TextInput
                            value={step.timing || ""}
                            onChange={(v) =>
                              patchStep(step.id, { timing: v, title: `Wait ${v || ""}`.trim() })
                            }
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

          <Panel
            title="Create"
            description="After you create the workflow you can edit any step and approve it."
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
                  ? `${steps.length} step${steps.length === 1 ? "" : "s"} ready.`
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
