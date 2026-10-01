import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  activatePayflowClient,
  createPayflowClientPortfolio,
  getPayflowClient,
  getPayflowClientMappingCatalog,
  listPayflowUsers,
  updatePayflowClient,
  updatePayflowClientPortfolio,
} from "../../api/payflow";
import {
  AiGovernanceSection,
  BrandingSection,
  DataSourceSection,
  MappingSection,
  ProfileSection,
  SupervisorSection,
  draftFromDetail,
  draftToUpdatePayload,
  emptyDraft,
  type ClientDraft,
  type ClientDraftConfig,
} from "../../components/payflow/client-config-sections";
import {
  Btn,
  DataTable,
  Field,
  KpiCard,
  PageHeader,
  Panel,
  PrimaryCell,
  SelectInput,
  StatusPill,
  Td,
  TextInput,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { cn } from "../../lib/utils";
import type { PayflowClientDetail, PayflowPortfolio, PayflowUser } from "../../types";

const MAIN_TABS = [
  "Overview",
  "Sub-Clients / Portfolios",
  "Accounts",
  "Workflows",
  "Communications",
  "Rules",
  "Human Reviews",
  "Configuration",
] as const;

type MainTab = (typeof MAIN_TABS)[number];
const ENABLED_TABS: MainTab[] = ["Overview", "Sub-Clients / Portfolios", "Configuration"];

const CONFIG_SECTIONS = [
  "General",
  "Data Source",
  "Data Mapping",
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOperationsAdmin } = usePayFlowAccess();
  const id = Number(clientId);

  const initialTab = (searchParams.get("tab") as MainTab) || "Overview";
  const [tab, setTab] = useState<MainTab>(
    ENABLED_TABS.includes(initialTab) ? initialTab : "Overview",
  );
  const [configSection, setConfigSection] = useState<ConfigSection>("General");
  const [detail, setDetail] = useState<PayflowClientDetail | null>(null);
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft());
  const [supervisors, setSupervisors] = useState<PayflowUser[]>([]);
  const [payflowFields, setPayflowFields] = useState<string[]>(["— Not mapped —"]);
  const [governanceRules, setGovernanceRules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({
    name: "",
    code: "",
    status: "onboarding",
  });
  const [selectedPortfolio, setSelectedPortfolio] = useState<PayflowPortfolio | null>(null);
  const [portfolioEdit, setPortfolioEdit] = useState({
    name: "",
    code: "",
    status: "onboarding",
    description: "",
  });

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
      setPayflowFields(catalog.payflow_fields || ["— Not mapped —"]);
      setGovernanceRules(catalog.governance_rules || []);
      setSelectedPortfolio((prev) => {
        if (!prev) return null;
        const refreshed = (client.portfolios || []).find((p) => p.id === prev.id) || null;
        return refreshed;
      });
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

  const readOnly = !isOperationsAdmin;

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

  async function addPortfolio(e: FormEvent) {
    e.preventDefault();
    if (!detail || readOnly) return;
    const name = portfolioForm.name.trim();
    const code = portfolioForm.code.trim();
    const missing: string[] = [];
    if (!name) missing.push("Portfolio name is required");
    if (!code) missing.push("Portfolio code / reference is required");
    if (missing.length) {
      setError(missing.join(". "));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createPayflowClientPortfolio(detail.id, {
        name,
        code,
        status: portfolioForm.status,
      });
      setPortfolioForm({ name: "", code: "", status: "onboarding" });
      await load();
      setInfo("Portfolio added.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to add portfolio");
    } finally {
      setBusy(false);
    }
  }

  function openPortfolioDetail(p: PayflowPortfolio) {
    setSelectedPortfolio(p);
    setPortfolioEdit({
      name: p.name,
      code: p.code,
      status: p.status || "onboarding",
      description: p.description || "",
    });
    setError("");
    setInfo("");
  }

  async function savePortfolioDetail(e: FormEvent) {
    e.preventDefault();
    if (!detail || !selectedPortfolio || readOnly) return;
    const name = portfolioEdit.name.trim();
    const code = portfolioEdit.code.trim();
    const missing: string[] = [];
    if (!name) missing.push("Portfolio name is required");
    if (!code) missing.push("Portfolio code / reference is required");
    if (missing.length) {
      setError(missing.join(". "));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await updatePayflowClientPortfolio(detail.id, selectedPortfolio.id, {
        name,
        code,
        status: portfolioEdit.status,
        description: portfolioEdit.description.trim() || undefined,
      });
      setSelectedPortfolio(updated);
      setPortfolioEdit({
        name: updated.name,
        code: updated.code,
        status: updated.status || "onboarding",
        description: updated.description || "",
      });
      await load();
      setInfo("Portfolio updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to update portfolio");
    } finally {
      setBusy(false);
    }
  }

  const changeTab = (next: MainTab) => {
    if (!ENABLED_TABS.includes(next)) return;
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
    payflowFields,
    governanceRules,
    readOnly,
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
            {detail.data_source_type === "crm" && <StatusPill tone="success">CRM</StatusPill>}
            <span className="text-[12px] text-muted-foreground">Supervisors: {supervisorLabel}</span>
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

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {MAIN_TABS.map((t) => {
          const enabled = ENABLED_TABS.includes(t);
          return (
            <button
              key={t}
              type="button"
              disabled={!enabled}
              onClick={() => changeTab(t)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-[13px] whitespace-nowrap transition-colors",
                tab === t
                  ? "border-primary font-semibold text-primary"
                  : enabled
                    ? "border-transparent font-medium text-muted-foreground hover:border-border-strong hover:text-foreground"
                    : "cursor-not-allowed border-transparent font-medium text-muted-foreground/50",
              )}
              title={enabled ? undefined : "Coming soon"}
            >
              {t}
            </button>
          );
        })}
      </div>

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Customer Accounts" value="0" />
            <KpiCard label="Active Cases" value="0" />
            <KpiCard label="Outstanding" value="—" />
            <KpiCard label="Recovered" value="—" />
            <KpiCard label="Human Reviews" value="0" />
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
            <Panel title="Communication Performance" description="Last 30 days, this client only.">
              <p className="text-[13px] text-muted-foreground">No communication activity yet.</p>
            </Panel>
          </div>
        </div>
      )}

      {tab === "Sub-Clients / Portfolios" && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            A sub-client / portfolio belongs to the main client and holds different account
            populations.
          </p>
          {isOperationsAdmin && (
            <Panel title="Add Sub-Client / Portfolio">
              <form id="portfolio-form" onSubmit={addPortfolio} className="grid gap-3 sm:grid-cols-4">
                <Field label="Portfolio Name">
                  <TextInput
                    value={portfolioForm.name}
                    onChange={(v) => setPortfolioForm((f) => ({ ...f, name: v }))}
                    placeholder="PayPal Loans"
                  />
                </Field>
                <Field label="Portfolio Code / Reference">
                  <TextInput
                    value={portfolioForm.code}
                    onChange={(v) => setPortfolioForm((f) => ({ ...f, code: v }))}
                    placeholder="PP-PF-01"
                  />
                </Field>
                <Field label="Status">
                  <SelectInput
                    value={portfolioForm.status}
                    options={["onboarding", "active", "paused"]}
                    onChange={(v) => setPortfolioForm((f) => ({ ...f, status: v }))}
                  />
                </Field>
                <div className="flex items-end">
                  <Btn
                    variant="primary"
                    disabled={busy}
                    onClick={() => {
                      const form = document.getElementById("portfolio-form") as HTMLFormElement | null;
                      form?.requestSubmit();
                    }}
                  >
                    Add portfolio
                  </Btn>
                </div>
              </form>
            </Panel>
          )}
          <DataTable
            minWidth={900}
            head={["Portfolio", "Reference", "Status", "Accounts / Cases", "Outstanding", "Active Strategy", ""]}
          >
            {(detail.portfolios || []).map((p) => (
              <Tr key={p.id}>
                <Td>
                  <PrimaryCell
                    title={`${detail.name} > ${p.name}`}
                    subtitle={p.description || "Portfolio under this client"}
                  />
                </Td>
                <Td className="tabular text-muted-foreground">{p.code}</Td>
                <Td>
                  <StatusPill tone={statusTone(p.status)} dot>
                    {p.status}
                  </StatusPill>
                </Td>
                <Td className="tabular">— / —</Td>
                <Td className="tabular">—</Td>
                <Td className="text-muted-foreground">None applied</Td>
                <Td>
                  <button
                    type="button"
                    className="text-[12.5px] font-medium text-primary hover:underline"
                    onClick={() => openPortfolioDetail(p)}
                  >
                    View details
                  </button>
                </Td>
              </Tr>
            ))}
            {(detail.portfolios || []).length === 0 && (
              <tr>
                <Td className="text-muted-foreground">No portfolios yet.</Td>
              </tr>
            )}
          </DataTable>

          {selectedPortfolio ? (
            <Panel
              title={`Sub-Client / Portfolio · ${selectedPortfolio.name}`}
              description={`${detail.name} · ${selectedPortfolio.code}`}
            >
              <form
                id="portfolio-detail-form"
                onSubmit={savePortfolioDetail}
                className="grid gap-3 sm:grid-cols-2"
              >
                <Field label="Portfolio Name">
                  <TextInput
                    value={portfolioEdit.name}
                    onChange={(v) => setPortfolioEdit((f) => ({ ...f, name: v }))}
                    disabled={readOnly}
                  />
                </Field>
                <Field label="Portfolio Code / Reference">
                  <TextInput
                    value={portfolioEdit.code}
                    onChange={(v) => setPortfolioEdit((f) => ({ ...f, code: v }))}
                    disabled={readOnly}
                  />
                </Field>
                <Field label="Status">
                  <SelectInput
                    value={portfolioEdit.status}
                    options={["onboarding", "active", "paused"]}
                    onChange={(v) => setPortfolioEdit((f) => ({ ...f, status: v }))}
                    disabled={readOnly}
                  />
                </Field>
                <Field label="Description">
                  <TextInput
                    value={portfolioEdit.description}
                    onChange={(v) => setPortfolioEdit((f) => ({ ...f, description: v }))}
                    placeholder="Optional notes"
                    disabled={readOnly}
                  />
                </Field>
                <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                  {!readOnly ? (
                    <Btn
                      variant="primary"
                      disabled={busy}
                      onClick={() => {
                        const form = document.getElementById(
                          "portfolio-detail-form",
                        ) as HTMLFormElement | null;
                        form?.requestSubmit();
                      }}
                    >
                      {busy ? "Saving…" : "Save changes"}
                    </Btn>
                  ) : null}
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setSelectedPortfolio(null);
                      setError("");
                    }}
                  >
                    Close
                  </Btn>
                </div>
              </form>
              <div className="mt-4 grid gap-2 rounded-lg border border-border bg-muted/30 px-3 py-3 text-[12.5px] sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Accounts / Cases</p>
                  <p className="font-medium">— / —</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outstanding</p>
                  <p className="font-medium">—</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active Strategy</p>
                  <p className="font-medium">None applied</p>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
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
              <p className="text-[13px]">{detail.data_source_type === "crm" ? "CRM" : "Not selected"}</p>
              <StatusPill tone={detail.connection_status === "connected" ? "success" : "neutral"}>
                {detail.connection_status_label || "Not Connected"}
              </StatusPill>
            </Panel>
            <Panel title="DATA MAPPING">
              <p className="text-[13px]">
                {detail.mapping_summary.mapped}/{detail.mapping_summary.total} mapped
              </p>
              <p className="text-[12px] text-muted-foreground">
                {detail.mapping_summary.attention} need attention · {detail.mapping_summary.unmapped}{" "}
                unmapped
              </p>
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
            {isOperationsAdmin && detail.status === "draft" && (
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
              description={isOperationsAdmin ? "Changes save when you click Save." : "Read-only"}
              action={
                isOperationsAdmin ? (
                  <Btn variant="primary" disabled={busy} onClick={() => void saveConfig()}>
                    {busy ? "Saving…" : "Save"}
                  </Btn>
                ) : undefined
              }
            >
              {configSection === "General" && <ProfileSection {...sectionProps} />}
              {configSection === "Data Source" && <DataSourceSection {...sectionProps} />}
              {configSection === "Data Mapping" && <MappingSection {...sectionProps} />}
              {configSection === "Branding & Channels" && <BrandingSection {...sectionProps} />}
              {configSection === "AI & Governance" && <AiGovernanceSection {...sectionProps} />}
              {configSection === "Supervisors" && <SupervisorSection {...sectionProps} />}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
