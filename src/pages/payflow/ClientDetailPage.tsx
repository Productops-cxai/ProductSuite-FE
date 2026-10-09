import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  activatePayflowClient,
  createPayflowClientPortfolio,
  deletePayflowClient,
  getPayflowClient,
  getPayflowClientMappingCatalog,
  listPayflowUsers,
  updatePayflowClient,
  type UpdatePayflowClientPayload,
} from "../../api/payflow";
import {
  AiGovernanceSection,
  BrandingSection,
  DataSourceSection,
  ProfileSection,
  SupervisorSection,
  draftFromDetail,
  draftToUpdatePayload,
  emptyDraft,
  type ClientDraft,
  type ClientDraftConfig,
} from "../../components/payflow/client-config-sections";
import {
  ClientAccountsTab,
  ClientRulesTab,
} from "../../components/payflow/client-detail-tabs";
import { PortfolioSection } from "../../components/payflow/portfolio-section";
import {
  Btn,
  KpiCard,
  PageHeader,
  Panel,
  PrimaryCell,
  SectionHeading,
  StatusPill,
  TabBar,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";
import {
  buildActivationChecks,
  buildOnboardingStages,
  configSectionHint,
  isClientSettingUp,
  missingSetupChips,
  setupTargetForLabel,
  type OnboardingStage,
  type SetupCheck,
} from "../../lib/client-setup";
import { cn } from "../../lib/utils";
import type { PayflowClientDetail, PayflowUser } from "../../types";

// Workflows / Communications / Human Reviews tabs parked — see src/_design_backup/payflow-ai-ops
const MAIN_TABS = [
  "Overview",
  "Sub-Clients / Portfolios",
  "Accounts",
  "Rules",
  "Configuration",
] as const;

type MainTab = (typeof MAIN_TABS)[number];

const CONFIG_SECTIONS = [
  "General",
  "Data Source",
  "Data Mapping",
  "Branding & Channels",
  "AI & Governance",
  "Assigned Users",
] as const;

type ConfigSection = (typeof CONFIG_SECTIONS)[number];

function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "active") return "success";
  if (s === "draft") return "neutral";
  if (s === "onboarding") return "info";
  return "warning";
}

export function PayFlowClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = usePayFlowAccess();
  const canEdit = hasPermission("edit_client");
  const canDelete = hasPermission("delete_client");
  const id = Number(clientId);

  const initialTab = (searchParams.get("tab") as MainTab) || "Overview";
  const [tab, setTab] = useState<MainTab>(
    MAIN_TABS.includes(initialTab) ? initialTab : "Overview",
  );
  const [configSection, setConfigSection] = useState<ConfigSection>("General");
  const [detail, setDetail] = useState<PayflowClientDetail | null>(null);
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft());
  const [supervisors, setSupervisors] = useState<PayflowUser[]>([]);
  const [governanceRules, setGovernanceRules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    if (!Number.isFinite(id)) {
      setError("Invalid client");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [client, users, catalog] = await Promise.all([
        getPayflowClient(id),
        listPayflowUsers(),
        getPayflowClientMappingCatalog(),
      ]);
      setDetail(client);
      setDraft(draftFromDetail(client));
      setSupervisors(
        (users.users || []).filter((u) => u.role_scope === "client_scoped"),
      );
      setGovernanceRules(catalog.governance_rules || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load client");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const patch = (p: Partial<ClientDraft>) => setDraft((d) => ({ ...d, ...p }));
  const patchConfig = (p: Partial<ClientDraftConfig>) =>
    setDraft((d) => ({ ...d, config: { ...d.config, ...p } }));

  const readOnly = !canEdit;
  const brandingReadOnly = readOnly || detail?.status !== "draft";

  async function saveConfig() {
    if (!detail || readOnly) return;
    if (configSection === "Branding & Channels" && detail.status !== "draft") {
      setError("Branding & channels can only be updated while the client is in Draft status");
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const full = draftToUpdatePayload(draft);
      // Branding is Draft-only — omit so other config sections can still save after activation.
      let payload: UpdatePayflowClientPayload = full;
      if (detail.status !== "draft") {
        const {
          brand_name: _brand,
          sender_name: _sender,
          email_from: _email,
          sms_sender_id: _sms,
          channels: _channels,
          ...rest
        } = full;
        payload = rest;
      }
      const updated = await updatePayflowClient(detail.id, payload);
      setDetail(updated);
      setDraft(draftFromDetail(updated));
      setInfo("Changes saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    if (!detail || readOnly) return;
    setBusy(true);
    setError("");
    try {
      await updatePayflowClient(detail.id, draftToUpdatePayload(draft));
      const updated = await activatePayflowClient(detail.id);
      setDetail(updated);
      setDraft(draftFromDetail(updated));
      setInfo("Client activated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  async function addPortfolio(payload: { name: string; code: string; status: string }) {
    if (!detail || readOnly) return;
    setBusy(true);
    setError("");
    try {
      await createPayflowClientPortfolio(detail.id, payload);
      await load();
      setInfo("Portfolio added.");
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to add portfolio";
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteClient() {
    if (!detail || readOnly) return;
    setBusy(true);
    setError("");
    try {
      await deletePayflowClient(detail.id);
      navigate("/payflow/clients");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to delete client");
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  const changeTab = (next: MainTab) => {
    setTab(next);
    setSearchParams(next === "Overview" ? {} : { tab: next });
  };

  const goSetupTarget = (target: OnboardingStage["target"]) => {
    if (target === "portfolios") {
      changeTab("Sub-Clients / Portfolios");
      return;
    }
    if (target === "activation") {
      changeTab("Configuration");
      requestAnimationFrame(() => {
        document.getElementById("activation-readiness")?.scrollIntoView({ behavior: "smooth" });
      });
      return;
    }
    if (target === "mapping" || target === "Data Mapping") {
      changeTab("Configuration");
      setConfigSection("Data Mapping");
      return;
    }
    if (target === "Supervisors") {
      changeTab("Configuration");
      setConfigSection("Assigned Users");
      return;
    }
    if (target && CONFIG_SECTIONS.includes(target as ConfigSection)) {
      changeTab("Configuration");
      setConfigSection(target as ConfigSection);
    }
  };

  const supervisorLabel = useMemo(
    () =>
      (detail?.supervisors || [])
        .map((s) => s.full_name)
        .filter(Boolean)
        .join(", ") || "None assigned",
    [detail],
  );

  const activationChecks = useMemo(
    () => (detail ? buildActivationChecks(detail) : []),
    [detail],
  );
  const onboardingStages = useMemo(
    () => (detail ? buildOnboardingStages(detail) : []),
    [detail],
  );
  const checksDone = activationChecks.filter((c) => c.done).length;
  const checksPct = activationChecks.length
    ? Math.round((checksDone / activationChecks.length) * 100)
    : 0;
  const requiredBlockers = activationChecks.filter((c) => c.required && !c.done);

  if (loading) {
    return <p className="text-[13px] text-muted-foreground">Loading client…</p>;
  }

  if (!detail) {
    return (
      <Panel title="Client not found">
        <p className="text-[13px] text-muted-foreground">{error || "Unable to load this client."}</p>
        <Link to="/payflow/clients" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to clients
        </Link>
      </Panel>
    );
  }

  const statusLabel = detail.status_label || detail.status;
  const sectionProps = {
    draft,
    patch,
    patchConfig,
    supervisorUsers: supervisors,
    governanceRules,
    readOnly,
    clientId: detail.id,
    onClientUpdated: (updated: { logo_url?: string | null }) => {
      setDetail((prev) => (prev ? { ...prev, logo_url: updated.logo_url ?? null } : prev));
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
          { label: detail.name },
        ]}
        title={detail.name}
        description={`${detail.business_domain_label || detail.industry || "Collections"} · ${detail.code} · ${detail.client_type_label || "—"}`}
        actions={
          <>
            <Link
              to="/payflow/clients"
              className="text-[12.5px] font-semibold text-primary hover:underline"
            >
              ← Back to Clients
            </Link>
            {canEdit && isClientSettingUp(statusLabel) ? (
              <Btn variant="primary" onClick={() => changeTab("Configuration")}>
                Edit configuration
              </Btn>
            ) : null}
            <StatusPill tone={statusTone(statusLabel)}>{statusLabel}</StatusPill>
            {detail.ai_mode_label ? (
              <StatusPill tone={detail.ai_mode_label === "Autopilot" ? "ai" : "neutral"}>
                {detail.ai_mode_label}
              </StatusPill>
            ) : null}
            <StatusPill
              tone={
                (detail.data_source_type || "").toLowerCase() === "file" ||
                (detail.connection_status || "").toLowerCase() === "connected"
                  ? "info"
                  : "warning"
              }
            >
              {(detail.data_source_type || "").toLowerCase() === "file"
                ? "Daily file"
                : (detail.data_source_type || "").toUpperCase() || "No data source"}
            </StatusPill>
            <StatusPill>Supervisor: {supervisorLabel}</StatusPill>
            {canDelete ? (
              <Btn variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Btn>
            ) : null}
          </>
        }
      />

      {error && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      )}
      {info && (
        <p className="mb-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-[13px] text-success">
          {info}
        </p>
      )}

      {(() => {
            const missing = missingSetupChips(detail);
            if (missing.length === 0) return null;
            const drafting = isClientSettingUp(statusLabel);
            return (
              <div className="mb-4 rounded-lg border border-warning/40 bg-warning/8 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">
                      <span className="mr-1.5 inline-block" aria-hidden>
                        ⚠
                      </span>
                      Client setup incomplete — {missing.length} step
                      {missing.length > 1 ? "s" : ""} left
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {drafting
                        ? "Complete the remaining configuration to activate this Client. It stays in Draft until an Operations Admin activates it."
                        : "Some onboarding steps are still open — for example Sub-Clients / Portfolios."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {missing.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => goSetupTarget(setupTargetForLabel(m))}
                          className="cursor-pointer"
                        >
                          <StatusPill tone="warning">{m}</StatusPill>
                        </button>
                      ))}
                    </div>
                  </div>
                  {canEdit ? (
                    <Btn
                      variant="primary"
                      className="shrink-0"
                      onClick={() =>
                        missing.some((m) => /portfolio|sub-client/i.test(m))
                          ? goSetupTarget("portfolios")
                          : changeTab("Configuration")
                      }
                    >
                      Complete Setup
                    </Btn>
                  ) : null}
                </div>
              </div>
            );
          })()}

      <TabBar tabs={MAIN_TABS} active={tab} onChange={changeTab} />

      {tab === "Overview" && (
        <div className="space-y-4">
          <Panel
            title="Latest Source File"
            description="Every figure on this page is based on the most recently received and assigned file."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PrimaryCell
                title={detail.updated_at ? new Date(detail.updated_at).toLocaleString() : "—"}
                subtitle="Last updated"
              />
              <PrimaryCell title="—" subtitle="Assigned to Collections" />
              <PrimaryCell title="—" subtitle="Accounts in this File" />
              <PrimaryCell title="—" subtitle="Change Since Previous File" />
            </div>
          </Panel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Customer Accounts" value="0" />
            <KpiCard label="Active Cases" value="0" />
            <KpiCard label="Outstanding" value="—" />
            <KpiCard label="Recovered" value="—" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Collection Summary">
              <ul className="space-y-2 text-[13px]">
                <li className="flex justify-between"><span className="text-muted-foreground">Accounts under collection</span><span>0</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">Outstanding balance</span><span>—</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">Amount recovered</span><span>—</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">Recovery rate</span><span>—</span></li>
              </ul>
            </Panel>
            <Panel title="File intake">
              <p className="text-[13px] text-muted-foreground">
                Performance panels for communications and human review will return after redesign.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {tab === "Sub-Clients / Portfolios" && (
        <PortfolioSection
          clientId={detail.id}
          clientName={detail.name}
          portfolios={detail.portfolios || []}
          canEdit={canEdit}
          busy={busy}
          onAdd={addPortfolio}
          onError={setError}
          onDeleted={() => void load()}
        />
      )}

      {tab === "Accounts" && (
        <ClientAccountsTab clientId={detail.id} clientName={detail.name} />
      )}

      {tab === "Rules" && (
        <ClientRulesTab clientId={detail.id} clientName={detail.name} />
      )}

      {tab === "Configuration" && (
        <div className="space-y-5">
          <Panel
            title="Client configuration overview"
            description="Single source of truth for how this client is set up. Account and case activity lives in the Accounts tab."
            action={
              <StatusPill tone={requiredBlockers.length === 0 ? "success" : "warning"} dot>
                {requiredBlockers.length === 0
                  ? "Ready for activation"
                  : `${requiredBlockers.length} blocker${requiredBlockers.length > 1 ? "s" : ""}`}
              </StatusPill>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <OverviewCard
                title="Client"
                tone="neutral"
                status={detail.client_type_label || "—"}
                lines={[
                  detail.name,
                  `${detail.industry || detail.category || "Collections"} · ${detail.code || "No code"}`,
                  `${detail.business_domain_label || "Collections"} · ${detail.ai_mode_label || "—"}`,
                ]}
                onClick={() => goSetupTarget("General")}
              />
              <OverviewCard
                title="Sub-Clients / Portfolios"
                tone={(detail.portfolio_count || 0) > 0 ? "success" : "warning"}
                status={
                  (detail.portfolio_count || 0) > 0
                    ? `${detail.portfolio_count} total`
                    : "Pending"
                }
                lines={[
                  `${(detail.portfolios || []).filter((p) => (p.status || "").toLowerCase() === "active").length} active`,
                  `${(detail.portfolios || []).filter((p) => (p.status || "").toLowerCase() !== "active").length} onboarding / other`,
                ]}
                onClick={() => goSetupTarget("portfolios")}
                cta="Manage portfolios"
              />
              <OverviewCard
                title="Data Source"
                tone={
                  (detail.data_source_type || "").toLowerCase() === "file" ||
                  (detail.connection_status || "").toLowerCase() === "connected"
                    ? "success"
                    : "warning"
                }
                status={
                  (detail.data_source_type || "").toLowerCase() === "file"
                    ? "Ready for file intake"
                    : detail.connection_status_label || "Not Connected"
                }
                lines={[
                  (detail.data_source_type || "").toLowerCase() === "file"
                    ? "Daily file"
                    : detail.data_source_type?.toUpperCase() || "No source selected",
                  `Last file: ${
                    detail.updated_at
                      ? new Date(detail.updated_at).toLocaleString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"
                  }`,
                ]}
                onClick={() => goSetupTarget("Data Source")}
              />
              <OverviewCard
                title="Branding & Communication"
                tone={
                  detail.onboarding.steps.find((s) => s.key === "branding")?.status === "complete"
                    ? "success"
                    : "warning"
                }
                status={
                  detail.client_type_label === "Third Party" ? "PayFlow branded" : "Client branded"
                }
                lines={[
                  `${detail.sender_name || "No sender"} · ${detail.email_from || "—"}`,
                  `Channels: ${
                    [detail.channels.email && "Email", detail.channels.sms && "SMS"]
                      .filter(Boolean)
                      .join(", ") || "None"
                  } · WhatsApp coming later`,
                ]}
                onClick={() => goSetupTarget("Branding & Channels")}
              />
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Onboarding progress
                  </p>
                  <span className="tabular text-[13px] font-semibold">{checksPct}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${checksPct}%` }}
                  />
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {checksDone} of {activationChecks.length} steps complete
                </p>
              </div>
            </div>

            <OnboardingStepper stages={onboardingStages} onGo={goSetupTarget} />

            <div className="mt-4" id="activation-readiness">
              <SectionHeading title="Activation readiness" />
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {activationChecks.map((x) => (
                  <ActivationCheckRow key={x.label} check={x} />
                ))}
              </ul>
              {canEdit && detail.status === "draft" ? (
                <div className="mt-3">
                  <Btn
                    variant="primary"
                    disabled={busy || detail.activation_blockers.length > 0}
                    onClick={() => void activate()}
                  >
                    Activate Client
                  </Btn>
                </div>
              ) : null}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="panel overflow-hidden p-2">
              {CONFIG_SECTIONS.map((s) => {
                const hint = configSectionHint(s, detail);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setConfigSection(s)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[13px]",
                      configSection === s
                        ? "bg-accent font-semibold text-primary"
                        : "text-muted-foreground hover:bg-surface",
                    )}
                  >
                    <span>{s}</span>
                    {hint ? (
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wide",
                          hint === "Done" ? "text-success" : "text-warning",
                        )}
                      >
                        {hint}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <Panel
              title={configSection}
              description={
                configSection === "Data Mapping"
                  ? "System CRM → PayFlow catalog used for all clients."
                  : configSection === "Branding & Channels"
                    ? brandingReadOnly
                      ? "Branding is read-only after activation (Draft only)."
                      : "Changes save when you click Save."
                    : canEdit
                      ? "Changes save when you click Save."
                      : "Read-only"
              }
              action={
                canEdit &&
                configSection !== "Data Mapping" &&
                !(configSection === "Branding & Channels" && brandingReadOnly) ? (
                  <Btn variant="primary" disabled={busy} onClick={() => void saveConfig()}>
                    {busy ? "Saving…" : "Save"}
                  </Btn>
                ) : undefined
              }
            >
              {configSection === "General" && <ProfileSection {...sectionProps} />}
              {configSection === "Data Source" && <DataSourceSection {...sectionProps} />}
              {configSection === "Data Mapping" && (
                <div className="space-y-3 text-[13px]">
                  <p className="text-muted-foreground">
                    CRM → PayFlow field mapping is shared across all clients (system catalog). Client
                    onboarding uses daily file intake against that catalog.
                  </p>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    <li className="rounded-md border border-border px-3 py-2">
                      Mapped:{" "}
                      <span className="font-semibold">
                        {detail.mapping_summary?.mapped ?? "—"}
                      </span>
                    </li>
                    <li className="rounded-md border border-border px-3 py-2">
                      Need attention:{" "}
                      <span className="font-semibold">
                        {detail.mapping_summary?.attention ?? 0}
                      </span>
                    </li>
                    <li className="rounded-md border border-border px-3 py-2">
                      Unmapped:{" "}
                      <span className="font-semibold">
                        {detail.mapping_summary?.unmapped ?? 0}
                      </span>
                    </li>
                    <li className="rounded-md border border-border px-3 py-2">
                      Total:{" "}
                      <span className="font-semibold">
                        {detail.mapping_summary?.total ?? "—"}
                      </span>
                    </li>
                  </ul>
                  <Link
                    to="/payflow/system-mapping"
                    className="inline-block text-[12.5px] font-semibold text-primary hover:underline"
                  >
                    View system CRM mapping →
                  </Link>
                </div>
              )}
              {configSection === "Branding & Channels" && (
                <BrandingSection {...sectionProps} readOnly={brandingReadOnly} />
              )}
              {configSection === "AI & Governance" && <AiGovernanceSection {...sectionProps} />}
              {configSection === "Assigned Users" && <SupervisorSection {...sectionProps} />}
            </Panel>
          </div>
        </div>
      )}

      <ConfirmDelete
        open={confirmDelete}
        title={`Delete ${detail.name}?`}
        description="This deletes the client and related portfolios, accounts, cases, rules, workflows, reviews, communications, and supervisor assignments. The full record is saved in Deletion Logs."
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void deleteClient()}
      />
    </>
  );
}

function OverviewCard({
  title,
  tone,
  status,
  lines,
  onClick,
  cta = "Configure",
}: {
  title: string;
  tone: Tone;
  status: string;
  lines: string[];
  onClick?: () => void;
  cta?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <StatusPill tone={tone} dot>
          {status}
        </StatusPill>
      </div>
      <ul className="mt-2 space-y-0.5 text-[12.5px] text-foreground">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="mt-2 text-[12px] font-semibold text-primary hover:underline"
        >
          {cta}
        </button>
      ) : null}
    </div>
  );
}

function ActivationCheckRow({ check }: { check: SetupCheck }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-[12.5px]">
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            check.done ? "bg-success" : check.required ? "bg-warning" : "bg-muted-foreground",
          )}
        />
        {check.label}
        {!check.required ? (
          <span className="text-[11px] text-muted-foreground">(informational)</span>
        ) : null}
      </span>
      <span className="text-muted-foreground">{check.detail}</span>
    </li>
  );
}

function OnboardingStepper({
  stages,
  onGo,
}: {
  stages: OnboardingStage[];
  onGo: (target: OnboardingStage["target"]) => void;
}) {
  return (
    <div className="mt-4">
      <SectionHeading title="Onboarding progress" />
      <ol className="mt-2 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stages.map((st, i) => {
          const state = st.done ? "Completed" : st.blocked ? "Blocked" : "Pending";
          const tone: Tone = st.done ? "success" : st.blocked ? "danger" : "warning";
          const clickable = !st.done && !!st.target;
          return (
            <li key={st.key}>
              <button
                type="button"
                disabled={!st.target}
                onClick={() => st.target && onGo(st.target)}
                title={clickable ? `Go to ${st.label}` : undefined}
                className={cn(
                  "flex h-full w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
                  st.done
                    ? "border-success/40 bg-success/5"
                    : st.blocked
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border bg-surface",
                  st.target && "hover:border-primary",
                )}
              >
                <span className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
                      st.done
                        ? "bg-success text-success-foreground"
                        : st.blocked
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-secondary text-foreground",
                    )}
                  >
                    {st.done ? "✓" : st.blocked ? "!" : i + 1}
                  </span>
                  Step {i + 1}
                </span>
                <span className="text-[12.5px] font-semibold text-foreground">{st.label}</span>
                <StatusPill tone={tone} dot>
                  {state}
                </StatusPill>
                {clickable ? (
                  <span className="text-[11px] font-semibold text-primary">Complete step →</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
