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
  StatusPill,
  TabBar,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";
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
  "Branding & Channels",
  "AI & Governance",
  "Supervisors",
] as const;

type ConfigSection = (typeof CONFIG_SECTIONS)[number];

function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "active") return "success";
  if (s === "draft") return "neutral";
  if (s === "onboarding") return "info";
  return "warning";
}

function stepTone(status: string): Tone {
  if (status === "complete") return "success";
  if (status === "blocked") return "danger";
  if (status === "incomplete") return "warning";
  return "neutral";
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
        listPayflowUsers({ role_code: "supervisor" }),
        getPayflowClientMappingCatalog(),
      ]);
      setDetail(client);
      setDraft(draftFromDetail(client));
      setSupervisors(users.users || []);
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

  async function saveConfig() {
    if (!detail || readOnly) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const updated = await updatePayflowClient(detail.id, draftToUpdatePayload(draft));
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

  const supervisorLabel = useMemo(
    () =>
      (detail?.supervisors || [])
        .map((s) => s.full_name)
        .filter(Boolean)
        .join(", ") || "None assigned",
    [detail],
  );

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
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/payflow/clients" className="text-[12.5px] font-medium text-primary hover:underline">
              ← Back to Clients
            </Link>
            <StatusPill tone={statusTone(statusLabel)}>{statusLabel}</StatusPill>
            {detail.ai_mode_label && (
              <StatusPill tone={detail.ai_mode_label === "Autopilot" ? "ai" : "neutral"}>
                {detail.ai_mode_label}
              </StatusPill>
            )}
            <StatusPill tone="info">Daily file</StatusPill>
            <span className="text-[12px] text-muted-foreground">Supervisors: {supervisorLabel}</span>
            {canDelete ? (
              <Btn variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Btn>
            ) : null}
          </div>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Panel title="CLIENT">
              <p className="text-[13px] font-medium">{detail.name}</p>
              <p className="text-[12px] text-muted-foreground">{detail.code}</p>
              <p className="text-[12px] text-muted-foreground">
                {detail.business_domain_label || "Collections"} · {detail.ai_mode_label || "—"}
              </p>
              <StatusPill>{detail.client_type_label || "—"}</StatusPill>
            </Panel>
            <Panel title="SUB-CLIENTS / PORTFOLIOS">
              <p className="text-[13px]">{detail.portfolio_count} total</p>
              <button
                type="button"
                className="mt-2 text-[12.5px] font-semibold text-primary"
                onClick={() => changeTab("Sub-Clients / Portfolios")}
              >
                Manage portfolios
              </button>
            </Panel>
            <Panel title="DATA SOURCE">
              <p className="text-[13px]">Daily file</p>
              <StatusPill tone="success">Ready for file intake</StatusPill>
              <Link
                to="/payflow/system-mapping"
                className="mt-2 inline-block text-[12.5px] font-semibold text-primary"
              >
                View system CRM mapping
              </Link>
            </Panel>
            <Panel title="BRANDING & COMMUNICATION">
              <p className="text-[13px]">{detail.email_from || "—"}</p>
              <p className="text-[12px] text-muted-foreground">
                {[detail.channels.email && "Email", detail.channels.sms && "SMS"]
                  .filter(Boolean)
                  .join(", ") || "No channels"}
              </p>
            </Panel>
            <Panel title="ONBOARDING PROGRESS">
              <p className="text-[22px] font-bold text-foreground">{detail.onboarding.percent}%</p>
              <p className="text-[12px] text-muted-foreground">
                {detail.onboarding.completed_required} of {detail.onboarding.total_required} required
                steps complete
              </p>
            </Panel>
          </div>

          <Panel title="Onboarding progress">
            <div className="flex flex-wrap gap-2">
              {detail.onboarding.steps.map((s, i) => (
                <div
                  key={s.key}
                  className="min-w-[140px] flex-1 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <p className="text-[11px] text-muted-foreground">
                    Step {i + 1}: {s.label}
                  </p>
                  <StatusPill tone={stepTone(s.status)}>{s.status}</StatusPill>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Activation readiness">
            <ul className="grid gap-2 sm:grid-cols-2 text-[13px]">
              {(detail.activation_blockers.length
                ? detail.activation_blockers
                : ["All required activation conditions are satisfied"]
              ).map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-1 size-2 rounded-full",
                      detail.activation_blockers.length ? "bg-warning" : "bg-success",
                    )}
                  />
                  <span className="text-muted-foreground">{b}</span>
                </li>
              ))}
            </ul>
            {canEdit && detail.status === "draft" && (
              <div className="mt-3">
                <Btn
                  variant="primary"
                  disabled={busy || detail.activation_blockers.length > 0}
                  onClick={() => void activate()}
                >
                  Activate Client
                </Btn>
              </div>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="panel overflow-hidden p-2">
              {CONFIG_SECTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setConfigSection(s)}
                  className={cn(
                    "block w-full rounded-md px-3 py-2 text-left text-[13px]",
                    configSection === s
                      ? "bg-accent font-semibold text-primary"
                      : "text-muted-foreground hover:bg-surface",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Panel
              title={configSection}
              description={canEdit ? "Changes save when you click Save." : "Read-only"}
              action={
                canEdit ? (
                  <Btn variant="primary" disabled={busy} onClick={() => void saveConfig()}>
                    {busy ? "Saving…" : "Save"}
                  </Btn>
                ) : undefined
              }
            >
              {configSection === "General" && <ProfileSection {...sectionProps} />}
              {configSection === "Data Source" && <DataSourceSection {...sectionProps} />}
              {configSection === "Branding & Channels" && <BrandingSection {...sectionProps} />}
              {configSection === "AI & Governance" && <AiGovernanceSection {...sectionProps} />}
              {configSection === "Supervisors" && <SupervisorSection {...sectionProps} />}
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
