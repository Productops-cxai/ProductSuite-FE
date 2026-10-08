import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  activatePayflowClient,
  createPayflowClient,
  getPayflowClient,
  getPayflowClientMappingCatalog,
  listPayflowUsers,
  updatePayflowClient,
} from "../../api/payflow";
import {
  AiGovernanceSection,
  BrandingSection,
  DataSourceSection,
  ProfileSection,
  SupervisorSection,
  connectionTone,
  draftFromDetail,
  draftToUpdatePayload,
  emptyDraft,
  type ClientDraft,
  type ClientDraftConfig,
} from "../../components/payflow/client-config-sections";
import { Btn, PageHeader, Panel, StatusPill, type Tone } from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { cn } from "../../lib/utils";
import type { PayflowUser } from "../../types";

const steps = [
  "Client Profile",
  "Data Source",
  "Branding & Channels",
  "AI & Governance",
  "Supervisors",
  "Review & Activate",
] as const;

const stepDescriptions = [
  "Basic client information.",
  "Daily file intake for this client (CRM mapping is system-wide).",
  "How customer-facing communications represent this client.",
  "How PayFlow operates collection activity for this client.",
  "Who supervises this client.",
  "Confirm configuration before activation.",
];

export function PayFlowClientNewPage() {
  const { hasPermission } = usePayFlowAccess();
  const canCreate = hasPermission("create_client");
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft());
  const [clientId, setClientId] = useState<number | null>(null);
  const [supervisors, setSupervisors] = useState<PayflowUser[]>([]);
  const [governanceRules, setGovernanceRules] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activatedName, setActivatedName] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      listPayflowUsers({ role_code: "supervisor" }),
      getPayflowClientMappingCatalog(),
    ])
      .then(([users, catalog]) => {
        setSupervisors(users.users || []);
        setGovernanceRules(catalog.governance_rules || []);
      })
      .catch(() => {
        /* non-blocking for initial render */
      });
  }, []);

  const patch = (p: Partial<ClientDraft>) => setDraft((d) => ({ ...d, ...p }));
  const patchConfig = (p: Partial<ClientDraftConfig>) =>
    setDraft((d) => ({ ...d, config: { ...d.config, ...p } }));

  const supervisorNames = useMemo(() => {
    const map = new Map(supervisors.map((u) => [String(u.id), u.full_name]));
    return draft.supervisorUserIds.map((id) => map.get(id) || id);
  }, [draft.supervisorUserIds, supervisors]);

  const issues: string[] = [];
  if (!draft.name.trim()) issues.push("Client name is required");
  if (!draft.config.code.trim()) issues.push("Client code is required");
  if (!draft.config.channels.email && !draft.config.channels.sms)
    issues.push("At least one communication channel must be enabled");
  if (draft.supervisorUserIds.length === 0) issues.push("Assign at least one supervisor");

  async function ensureDraftSaved(): Promise<number> {
    const payload = draftToUpdatePayload(draft);
    if (!payload.name || !payload.code) {
      throw new ApiError(400, "Client name and code are required before saving");
    }
    if (clientId == null) {
      const created = await createPayflowClient({
        name: payload.name,
        code: payload.code,
        client_type: payload.client_type,
        business_domain: payload.business_domain,
        industry: payload.industry,
        ai_mode: payload.ai_mode,
      });
      setClientId(created.id);
      const updated = await updatePayflowClient(created.id, payload);
      setDraft(draftFromDetail(updated));
      return created.id;
    }
    const updated = await updatePayflowClient(clientId, payload);
    setDraft(draftFromDetail(updated));
    return clientId;
  }

  async function saveDraftAndLeave() {
    setBusy(true);
    setError("");
    try {
      await ensureDraftSaved();
      navigate("/payflow/clients");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save draft");
    } finally {
      setBusy(false);
    }
  }

  async function continueNext() {
    setBusy(true);
    setError("");
    try {
      const id = await ensureDraftSaved();
      const detail = await getPayflowClient(id);
      setClientId(id);
      setDraft(draftFromDetail(detail));
      setStep((s) => Math.min(steps.length - 1, s + 1));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save step");
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    setBusy(true);
    setError("");
    try {
      const id = await ensureDraftSaved();
      const activated = await activatePayflowClient(id);
      setActivatedName(activated.name);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  if (!canCreate) {
    return (
      <Panel title="Client onboarding is restricted">
        <p className="text-sm text-muted-foreground">
          You need the Add Client permission to create clients.
        </p>
        <Link to="/payflow/clients" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to clients
        </Link>
      </Panel>
    );
  }

  if (activatedName) {
    return (
      <>
        <PageHeader
          breadcrumb={[
            { label: "Clients", to: "/payflow/clients" },
            { label: activatedName },
          ]}
          title={`${activatedName} is Ready for Operations`}
          description="Configuration saved. Customer accounts will appear once the first data sync completes."
        />
        <Panel title="Activation summary">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="success">Active</StatusPill>
            <StatusPill tone="info">{draft.aiMode}</StatusPill>
            <StatusPill>CRM data source</StatusPill>
            <StatusPill>Supervisors: {supervisorNames.join(", ") || "None"}</StatusPill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {clientId != null && (
              <Link to={`/payflow/clients/${clientId}`}>
                <Btn variant="primary">View Client</Btn>
              </Link>
            )}
            <Link to="/payflow/clients">
              <Btn variant="ghost">Return to Clients</Btn>
            </Link>
          </div>
        </Panel>
      </>
    );
  }

  const sectionProps = {
    draft,
    patch,
    patchConfig,
    supervisorUsers: supervisors,
    governanceRules,
    clientId,
    onClientUpdated: (updated: { logo_url?: string | null }) => {
      setDraft((d) => ({
        ...d,
        config: { ...d.config, logoUrl: updated.logo_url || null },
      }));
    },
  };

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Clients", to: "/payflow/clients" },
          { label: "Add Client" },
        ]}
        title="Add Client"
        description="Onboard an organization and configure how PayFlow operates its collections."
        actions={
          <Btn onClick={() => void saveDraftAndLeave()} disabled={busy}>
            Save as Draft
          </Btn>
        }
      />

      {error && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <div className="panel mb-5 overflow-x-auto px-4 py-3">
        <ol className="flex min-w-max items-center gap-2">
          {steps.map((label, i) => {
            const state = i === step ? "current" : i < step ? "done" : "todo";
            return (
              <li key={label} className="flex items-center gap-2">
                <button type="button" onClick={() => setStep(i)} className="flex items-center gap-2 text-left">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                      state === "current" && "border-primary bg-primary text-primary-foreground",
                      state === "done" && "border-success/30 bg-success/10 text-success",
                      state === "todo" && "border-border text-muted-foreground",
                    )}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-medium whitespace-nowrap",
                      state === "current" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </button>
                {i < steps.length - 1 && <span className="h-px w-6 bg-border" />}
              </li>
            );
          })}
        </ol>
      </div>

      <Panel
        title={`Step ${step + 1} of ${steps.length} · ${steps[step]}`}
        description={stepDescriptions[step] ?? ""}
      >
        {step === 0 && <ProfileSection {...sectionProps} />}
        {step === 1 && <DataSourceSection {...sectionProps} />}
        {step === 2 && <BrandingSection {...sectionProps} />}
        {step === 3 && <AiGovernanceSection {...sectionProps} />}
        {step === 4 && <SupervisorSection {...sectionProps} />}
        {step === 5 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ReviewBlock
                title="Client Profile"
                rows={[
                  draft.name || "—",
                  draft.config.code || "—",
                  draft.config.clientType,
                  draft.config.useCase,
                ]}
              />
              <ReviewBlock
                title="Data Source"
                rows={["Daily file", "Ready for file intake"]}
                tone={connectionTone("Connected")}
              />
              <ReviewBlock
                title="Channels"
                rows={[
                  `Email: ${draft.config.channels.email ? "Enabled" : "Disabled"}`,
                  `SMS: ${draft.config.channels.sms ? "Enabled" : "Disabled"}`,
                  "WhatsApp: Coming Later",
                ]}
              />
              <ReviewBlock title="AI Mode" rows={[draft.aiMode]} />
              <ReviewBlock
                title="Governance"
                rows={
                  draft.aiMode === "Autopilot"
                    ? ["Operating boundaries apply"]
                    : draft.config.governanceRules.length
                      ? [
                          `${draft.config.governanceRules.length} Rules Applied`,
                          ...draft.config.governanceRules,
                        ]
                      : ["No client-specific governance rules configured"]
                }
              />
              <ReviewBlock
                title="Supervisors"
                rows={supervisorNames.length ? supervisorNames : ["None assigned"]}
              />
            </div>

            <div
              className={cn(
                "rounded-lg border p-4",
                issues.length ? "border-warning/30 bg-warning/10" : "border-success/20 bg-success/10",
              )}
            >
              <p className="text-[13px] font-semibold text-foreground">
                {issues.length
                  ? `${issues.length} Item${issues.length > 1 ? "s" : ""} Require Attention`
                  : "Ready for Activation"}
              </p>
              {issues.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {issues.map((issue) => (
                    <li key={issue} className="text-[12px] text-muted-foreground">
                      · {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Panel>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Btn onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
          Back
        </Btn>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={() => void saveDraftAndLeave()} disabled={busy}>
            Save as Draft
          </Btn>
          {step < steps.length - 1 ? (
            <Btn variant="primary" onClick={() => void continueNext()} disabled={busy}>
              Continue
            </Btn>
          ) : (
            <Btn
              variant="primary"
              onClick={() => void activate()}
              disabled={busy || issues.length > 0}
            >
              Activate Client
            </Btn>
          )}
        </div>
      </div>
    </>
  );
}

function ReviewBlock({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: string[];
  tone?: Tone;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
      <p className="text-eyebrow">{title}</p>
      <div className="mt-1.5 space-y-0.5">
        {rows.map((r, i) => (
          <p
            key={r + i}
            className={cn(
              "text-[13px]",
              i === 0 ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {r}
          </p>
        ))}
      </div>
      {tone && tone !== "neutral" && <span className="sr-only">{tone}</span>}
    </div>
  );
}
