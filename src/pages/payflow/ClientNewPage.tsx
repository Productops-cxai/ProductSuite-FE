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
  brandingConfigIssues,
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
import type { PayflowClientMappingSummary, PayflowUser } from "../../types";

/** System catalog is healthy when required fields are mapped and nothing is flagged. */
function systemMappingOk(summary: PayflowClientMappingSummary | null): boolean {
  if (!summary) return true;
  return (summary.required_missing?.length ?? 0) === 0 && summary.attention === 0;
}

/** Matches Lovable Add Client (`account-payflow-ai/clients.new`). Sub-Clients/Portfolios stay on the client detail tab. */
const steps = [
  "Client Profile",
  "Data Source",
  "Data Mapping",
  "Branding & Channels",
  "AI & Governance",
  "Assigned Users",
  "Review & Activate",
] as const;

const stepDescriptions = [
  "Basic client information.",
  "Select the single primary operational data source.",
  "Confirm system CRM → PayFlow field mapping used for this client’s file intake.",
  "How customer-facing communications represent this client.",
  "How PayFlow operates collection activity for this client.",
  "Who supervises this client, and what they can access.",
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
  const [mappingSummary, setMappingSummary] = useState<PayflowClientMappingSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activatedName, setActivatedName] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      listPayflowUsers(),
      getPayflowClientMappingCatalog(),
    ])
      .then(([users, catalog]) => {
        setSupervisors(
          (users.users || []).filter((u) => u.role_scope === "client_scoped"),
        );
        setGovernanceRules(catalog.governance_rules || []);
        // System catalog drives mapping — same source Configuration uses.
        const fields = catalog.fields || [];
        const total = fields.length;
        const mapped = fields.filter((f) => Boolean((f.payflow_field || "").trim())).length;
        const requiredMissing = fields
          .filter((f) => f.required && !(f.payflow_field || "").trim())
          .map((f) => f.source_field);
        setMappingSummary({
          mapped,
          attention: requiredMissing.length,
          unmapped: Math.max(0, total - mapped),
          total,
          required_missing: requiredMissing,
        });
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

  const brandingIssues = brandingConfigIssues(draft);
  const mappingOk = systemMappingOk(mappingSummary);
  // Activation blockers match BE (mapping is system-wide — shown on step, not a client blocker).
  const issues: string[] = [];
  if (!draft.name.trim()) issues.push("Client name is required");
  if (!draft.config.code.trim()) issues.push("Client code is required");
  issues.push(...brandingIssues);
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
      if (updated.mapping_summary) setMappingSummary(updated.mapping_summary);
      return created.id;
    }
    const updated = await updatePayflowClient(clientId, payload);
    setDraft(draftFromDetail(updated));
    if (updated.mapping_summary) setMappingSummary(updated.mapping_summary);
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
      if (detail.mapping_summary) setMappingSummary(detail.mapping_summary);
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
          description="Configuration saved. Customer accounts will appear once the first data sync completes. Add Sub-Clients / Portfolios from the client detail page when needed."
        />
        <Panel title="Activation summary">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="success">Active</StatusPill>
            <StatusPill tone="info">{draft.aiMode}</StatusPill>
            <StatusPill>Daily file data source</StatusPill>
            <StatusPill>Supervisors: {supervisorNames.join(", ") || "None"}</StatusPill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {clientId != null && (
              <Link to={`/payflow/clients/${clientId}?tab=Sub-Clients%20%2F%20Portfolios`}>
                <Btn variant="primary">Add Sub-Clients / Portfolios</Btn>
              </Link>
            )}
            {clientId != null && (
              <Link to={`/payflow/clients/${clientId}`}>
                <Btn>View Client</Btn>
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
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className="flex items-center gap-2 text-left"
                >
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
        {step === 2 && (
          <SystemMappingStep summary={mappingSummary} mappingOk={mappingOk} />
        )}
        {step === 3 && <BrandingSection {...sectionProps} />}
        {step === 4 && <AiGovernanceSection {...sectionProps} />}
        {step === 5 && <SupervisorSection {...sectionProps} />}
        {step === 6 && (
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
                title="Data Mapping"
                rows={[
                  mappingSummary
                    ? `${mappingSummary.mapped}/${mappingSummary.total} mapped`
                    : "System CRM mapping",
                  mappingSummary
                    ? `${mappingSummary.attention} need attention · ${mappingSummary.unmapped} unmapped`
                    : "Shared system catalog",
                ]}
                tone={mappingOk ? "success" : "warning"}
              />
              <ReviewBlock
                title="Branding & Channels"
                rows={[
                  draft.config.clientType === "Third Party"
                    ? "PayFlow operator branding"
                    : `Brand: ${draft.config.brandName || "—"}`,
                  `Sender: ${draft.config.senderName || "—"}`,
                  `Email: ${draft.config.channels.email ? "Enabled" : "Disabled"}`,
                  `SMS: ${draft.config.channels.sms ? "Enabled" : "Disabled"}`,
                  brandingIssues.length
                    ? `Incomplete: ${brandingIssues.length} item(s)`
                    : "Branding complete",
                ]}
                tone={brandingIssues.length ? "warning" : "success"}
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
                title="Assigned Users"
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

function SystemMappingStep({
  summary,
  mappingOk,
}: {
  summary: PayflowClientMappingSummary | null;
  mappingOk: boolean;
}) {
  return (
    <div className="space-y-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={mappingOk ? "success" : "warning"} dot>
          {mappingOk ? "System mapping ready" : "Needs attention"}
        </StatusPill>
        {summary ? (
          <>
            <StatusPill tone="info">{summary.mapped} Mapped</StatusPill>
            <StatusPill tone="warning">{summary.attention} Need Attention</StatusPill>
            <StatusPill tone={summary.unmapped ? "danger" : "neutral"}>
              {summary.unmapped} Unmapped
            </StatusPill>
          </>
        ) : null}
      </div>
      <p className="text-muted-foreground">
        CRM → PayFlow field mapping is managed once in System CRM Mapping and applies to every
        client. Daily file intake for this client uses that shared catalog — there is nothing
        extra to map per client here.
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        <li className="rounded-md border border-border px-3 py-2">
          Mapped: <span className="font-semibold">{summary?.mapped ?? "—"}</span>
        </li>
        <li className="rounded-md border border-border px-3 py-2">
          Need attention: <span className="font-semibold">{summary?.attention ?? 0}</span>
        </li>
        <li className="rounded-md border border-border px-3 py-2">
          Unmapped: <span className="font-semibold">{summary?.unmapped ?? 0}</span>
        </li>
        <li className="rounded-md border border-border px-3 py-2">
          Total: <span className="font-semibold">{summary?.total ?? "—"}</span>
        </li>
      </ul>
      {(summary?.required_missing || []).length > 0 ? (
        <p className="text-[12px] text-warning">
          Required missing: {summary!.required_missing!.slice(0, 6).join(", ")}
          {(summary!.required_missing!.length || 0) > 6 ? "…" : ""}
        </p>
      ) : null}
      <Link
        to="/payflow/system-mapping"
        className="inline-block text-[12.5px] font-semibold text-primary hover:underline"
      >
        View system-wide CRM mapping →
      </Link>
    </div>
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
