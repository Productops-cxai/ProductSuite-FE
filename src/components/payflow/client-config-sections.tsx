import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Field,
  TextInput,
  SelectInput,
  ChoiceCard,
  ToggleRow,
  Btn,
  StatusPill,
  DataTable,
  Td,
  type Tone,
} from "./lovable/payflow-ui";
import { PermissionPicker } from "./PermissionPicker";
import { resolveAvatarUrl } from "../ui/UserAvatar";
import { removePayflowClientLogo, uploadPayflowClientLogo } from "../../api/payflow";
import { ApiError } from "../../api/client";
import type { PayflowClientMapping, PayflowPermissionGroup, PayflowUser } from "../../types";

export type ClientTypeLabel = "First Party" | "Third Party";
export type AiModeLabel = "Autopilot" | "Supervised AI";
export type ConnectionLabel =
  | "Not Connected"
  | "Connecting"
  | "Connected"
  | "Connection Failed";
export type MappingStatusLabel = "Mapped" | "Needs Attention" | "Unmapped" | "Validated";

export interface ClientDraftConfig {
  code: string;
  clientType: ClientTypeLabel;
  useCase: string;
  dataSource: "CRM" | null;
  connection: ConnectionLabel;
  environment: string;
  syncFrequency: string;
  mappings: {
    sourceField: string;
    payflowField: string;
    sampleValue: string;
    status: MappingStatusLabel;
    isRequired: boolean;
  }[];
  brandName: string;
  logoUrl: string | null;
  senderName: string;
  emailFrom: string;
  smsSenderId: string;
  channels: { email: boolean; sms: boolean; whatsapp: boolean };
  governanceRules: string[];
}

export interface ClientDraft {
  name: string;
  industry: string;
  aiMode: AiModeLabel;
  supervisorUserIds: string[];
  config: ClientDraftConfig;
}

export interface SectionProps {
  draft: ClientDraft;
  patch: (p: Partial<ClientDraft>) => void;
  patchConfig: (p: Partial<ClientDraftConfig>) => void;
  supervisorUsers?: PayflowUser[];
  permissionGroups?: PayflowPermissionGroup[];
  payflowFields?: string[];
  governanceRules?: string[];
  readOnly?: boolean;
  clientId?: number | null;
  onClientUpdated?: (detail: {
    logo_url?: string | null;
    brand_name?: string;
    sender_name?: string;
    email_from?: string;
    sms_sender_id?: string;
    channels?: { email: boolean; sms: boolean; whatsapp: boolean };
  }) => void;
}

export function connectionTone(state: ConnectionLabel): Tone {
  switch (state) {
    case "Connected":
      return "success";
    case "Connecting":
      return "info";
    case "Connection Failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function mappingSummary(config: ClientDraftConfig) {
  return {
    mapped: config.mappings.filter((m) => m.status === "Mapped" || m.status === "Validated").length,
    attention: config.mappings.filter((m) => m.status === "Needs Attention").length,
    unmapped: config.mappings.filter((m) => m.status === "Unmapped").length,
  };
}

export function emptyDraft(): ClientDraft {
  return {
    name: "",
    industry: "",
    aiMode: "Supervised AI",
    supervisorUserIds: [],
    config: {
      code: "",
      clientType: "Third Party",
      useCase: "Collections",
      dataSource: null,
      connection: "Not Connected",
      environment: "Sandbox",
      syncFrequency: "Every 15 minutes",
      mappings: [],
      brandName: "",
      logoUrl: null,
      senderName: "",
      emailFrom: "collections@payflow.io",
      smsSenderId: "PAYFLOW",
      channels: { email: true, sms: true, whatsapp: false },
      governanceRules: [],
    },
  };
}

export function draftFromDetail(
  detail: {
    name: string;
    code: string;
    industry?: string | null;
    category?: string | null;
    client_type_label?: string | null;
    ai_mode_label?: string | null;
    data_source_type?: string | null;
    connection_status_label?: string | null;
    environment?: string | null;
    sync_frequency?: string | null;
    brand_name?: string;
    logo_url?: string | null;
    sender_name?: string;
    email_from?: string;
    sms_sender_id?: string;
    channels?: { email: boolean; sms: boolean; whatsapp: boolean };
    governance_rules?: string[];
    mappings?: PayflowClientMapping[];
    supervisor_user_ids?: string[];
  },
): ClientDraft {
  return {
    name: detail.name || "",
    industry: detail.industry || detail.category || "",
    aiMode: (detail.ai_mode_label as AiModeLabel) || "Supervised AI",
    supervisorUserIds: detail.supervisor_user_ids || [],
    config: {
      code: detail.code || "",
      clientType: (detail.client_type_label as ClientTypeLabel) || "Third Party",
      useCase: "Collections",
      dataSource: detail.data_source_type === "crm" ? "CRM" : null,
      connection: (detail.connection_status_label as ConnectionLabel) || "Not Connected",
      environment: detail.environment || "Sandbox",
      syncFrequency: detail.sync_frequency || "Every 15 minutes",
      mappings: (detail.mappings || []).map((m) => ({
        sourceField: m.source_field,
        payflowField: m.payflow_field || "— Not mapped —",
        sampleValue: m.sample_value || "",
        status: (m.status_label as MappingStatusLabel) || "Unmapped",
        isRequired: m.is_required,
      })),
      brandName: detail.brand_name || "",
      logoUrl: detail.logo_url || null,
      senderName: detail.sender_name || "",
      emailFrom: detail.email_from || "collections@payflow.io",
      smsSenderId: detail.sms_sender_id || "PAYFLOW",
      channels: detail.channels || { email: true, sms: true, whatsapp: false },
      governanceRules: detail.governance_rules || [],
    },
  };
}

export function draftToUpdatePayload(draft: ClientDraft) {
  return {
    name: draft.name.trim(),
    code: draft.config.code.trim(),
    client_type: draft.config.clientType,
    business_domain: "Collections",
    industry: draft.industry.trim() || undefined,
    ai_mode: draft.aiMode,
    data_source_type: draft.config.dataSource === "CRM" ? "crm" : null,
    connection_status: draft.config.connection,
    environment: draft.config.environment,
    sync_frequency: draft.config.syncFrequency,
    brand_name: draft.config.brandName,
    sender_name: draft.config.senderName,
    email_from: draft.config.emailFrom,
    sms_sender_id: draft.config.smsSenderId,
    channels: draft.config.channels,
    governance_rules: draft.config.governanceRules,
    mappings: draft.config.mappings.map((m) => ({
      source_field: m.sourceField,
      payflow_field: m.payflowField,
      sample_value: m.sampleValue,
      status: m.status,
    })),
    supervisor_user_ids: draft.supervisorUserIds,
  };
}

/* ---------------- Profile ---------------- */

export function ProfileSection({ draft, patch, patchConfig, readOnly }: SectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Client Name">
        <TextInput
          value={draft.name}
          onChange={(v) => patch({ name: v })}
          placeholder="PayPal"
          disabled={readOnly}
        />
      </Field>
      <Field label="Client Code / Reference">
        <TextInput
          value={draft.config.code}
          onChange={(v) => patchConfig({ code: v })}
          placeholder="PP-CLT-004"
          disabled={readOnly}
        />
      </Field>
      <Field label="Client Type">
        <SelectInput
          value={draft.config.clientType}
          options={["First Party", "Third Party"]}
          onChange={(v) => patchConfig({ clientType: v as ClientTypeLabel })}
          disabled={readOnly}
        />
      </Field>
      <Field label="Industry">
        <TextInput
          value={draft.industry}
          onChange={(v) => patch({ industry: v })}
          placeholder="Payments"
          disabled={readOnly}
        />
      </Field>
      <Field label="Business Use Case" hint="Additional use cases arrive in a later phase.">
        <SelectInput
          value={draft.config.useCase || "Collections"}
          options={["Collections"]}
          onChange={(v) => patchConfig({ useCase: v })}
          disabled={readOnly}
        />
      </Field>
    </div>
  );
}

/* ---------------- Data source (CRM only) ---------------- */

export function DataSourceSection({ draft, patchConfig, readOnly }: SectionProps) {
  const { dataSource, connection } = draft.config;

  const selectCrm = () =>
    patchConfig({
      dataSource: "CRM",
      connection: dataSource === "CRM" ? connection : "Not Connected",
    });

  const test = () => {
    if (readOnly) return;
    patchConfig({ connection: "Connecting" });
    window.setTimeout(() => patchConfig({ connection: "Connected" }), 900);
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Where will PayFlow receive customer and account data for this client? One primary
        operational source only.
      </p>
      <div className="grid gap-3 sm:grid-cols-1 max-w-xl">
        <ChoiceCard
          title="CRM"
          description="PayFlow receives customer and account records from the client's CRM system."
          selected={dataSource === "CRM"}
          onSelect={readOnly ? undefined : selectCrm}
          disabled={readOnly}
        />
      </div>

      {dataSource === "CRM" && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-foreground">CRM connection</p>
              <p className="text-[11px] text-muted-foreground">
                Connection details are confirmed with the client during technical setup.
              </p>
            </div>
            <StatusPill tone={connectionTone(connection)}>{connection}</StatusPill>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Environment">
              <SelectInput
                value={draft.config.environment}
                options={["Sandbox", "Production"]}
                onChange={(v) => patchConfig({ environment: v })}
                disabled={readOnly}
              />
            </Field>
            <Field label="Sync Frequency">
              <SelectInput
                value={draft.config.syncFrequency}
                options={["Every 15 minutes", "Hourly", "Daily"]}
                onChange={(v) => patchConfig({ syncFrequency: v })}
                disabled={readOnly}
              />
            </Field>
          </div>
          {!readOnly && (
            <div className="mt-3 flex gap-2">
              <Btn onClick={test} disabled={connection === "Connecting"}>
                Test Connection
              </Btn>
              <Btn variant="ghost" onClick={() => patchConfig({ connection: "Connection Failed" })}>
                Simulate failure
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Mapping ---------------- */

const mappingStatuses: MappingStatusLabel[] = [
  "Mapped",
  "Validated",
  "Needs Attention",
  "Unmapped",
];

export function MappingSection({
  draft,
  patchConfig,
  payflowFields = ["— Not mapped —"],
  readOnly,
}: SectionProps) {
  const summary = mappingSummary(draft.config);

  const setField = (index: number, payflowField: string) => {
    const mappings = draft.config.mappings.map((m, i) =>
      i === index
        ? {
            ...m,
            payflowField,
            status: (payflowField === "— Not mapped —" ? "Unmapped" : "Mapped") as MappingStatusLabel,
          }
        : m,
    );
    patchConfig({ mappings });
  };

  const setStatus = (index: number, status: MappingStatusLabel) => {
    patchConfig({
      mappings: draft.config.mappings.map((m, i) => (i === index ? { ...m, status } : m)),
    });
  };

  if (!draft.config.dataSource && draft.config.mappings.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Select a data source first to map incoming fields.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="info">{summary.mapped} Mapped</StatusPill>
        <StatusPill tone="warning">{summary.attention} Need Attention</StatusPill>
        <StatusPill tone={summary.unmapped ? "danger" : "neutral"}>
          {summary.unmapped} Unmapped
        </StatusPill>
      </div>
      <DataTable head={["CRM Source", "PayFlow Field", "Sample", "Status"]}>
        {draft.config.mappings.map((m, i) => (
          <tr key={m.sourceField} className="border-b border-border last:border-0">
            <Td className="tabular text-muted-foreground">
              {m.sourceField}
              {m.isRequired ? " *" : ""}
            </Td>
            <Td>
              <SelectInput
                value={m.payflowField}
                options={payflowFields}
                onChange={(v) => setField(i, v)}
                disabled={readOnly}
              />
            </Td>
            <Td className="tabular text-muted-foreground">{m.sampleValue || "—"}</Td>
            <Td>
              <select
                value={m.status}
                onChange={(e) => setStatus(i, e.target.value as MappingStatusLabel)}
                disabled={readOnly}
                className="rounded-md border border-border bg-card px-2 py-1 text-[12px] outline-none"
              >
                {mappingStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Td>
          </tr>
        ))}
      </DataTable>
      <p className="text-[11px] text-muted-foreground">
        Catalog v0.3 — CRM placement columns → PayFlow fields. Required (*). Contact needs at least
        one channel (email and/or phone). History fields are PayFlow-built. Ambiguous / missing
        required fields show as Needs Attention.
      </p>
    </div>
  );
}

/* ---------------- Branding ---------------- */

export function BrandingSection({
  draft,
  patchConfig,
  readOnly,
  clientId,
  onClientUpdated,
}: SectionProps) {
  const c = draft.config;
  const thirdParty = c.clientType === "Third Party";
  const clientBrand = c.brandName || draft.name || "Client";
  const brand = thirdParty ? "PayFlow Collections" : clientBrand;
  const initials = brand.slice(0, 2).toUpperCase();
  const logoSrc = resolveAvatarUrl(c.logoUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  async function onLogoSelected(file: File | null) {
    if (!file || readOnly) return;
    if (clientId == null) {
      setLogoError("Save earlier steps first so this client exists, then upload a logo.");
      return;
    }
    setLogoBusy(true);
    setLogoError("");
    try {
      const updated = await uploadPayflowClientLogo(clientId, file);
      patchConfig({ logoUrl: updated.logo_url || null });
      onClientUpdated?.(updated);
    } catch (err) {
      setLogoError(err instanceof ApiError ? err.detail : "Failed to upload logo");
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemoveLogo() {
    if (clientId == null || readOnly || !c.logoUrl) return;
    setLogoBusy(true);
    setLogoError("");
    try {
      const updated = await removePayflowClientLogo(clientId);
      patchConfig({ logoUrl: null });
      onClientUpdated?.(updated);
      setPreviewOpen(false);
    } catch (err) {
      setLogoError(err instanceof ApiError ? err.detail : "Failed to remove logo");
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {previewOpen && logoSrc ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Client logo"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
            onClick={() => setPreviewOpen(false)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
          <img
            src={logoSrc}
            alt={`${clientBrand} logo`}
            className="max-h-[min(80vh,640px)] max-w-[min(90vw,520px)] rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      <div className="space-y-4">
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {thirdParty
            ? `This is a Third Party client, so customer-facing communications and the payment page use PayFlow collection-operator branding on behalf of ${clientBrand}.`
            : `This is a First Party client, so customer-facing communications and the payment page use ${clientBrand} branding.`}
        </p>
        <div className="flex items-start gap-3">
          <button
            type="button"
            disabled={logoBusy || (readOnly && !logoSrc)}
            title={logoSrc ? "View logo" : readOnly ? undefined : "Upload logo"}
            onClick={() => {
              if (logoSrc) setPreviewOpen(true);
              else if (!readOnly) fileRef.current?.click();
            }}
            className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface text-[13px] font-semibold text-foreground transition hover:ring-2 hover:ring-primary/40 disabled:cursor-default disabled:hover:ring-0"
          >
            {logoSrc ? (
              <img src={logoSrc} alt="" className="size-full object-cover" />
            ) : (
              initials
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground">Client Logo</p>
            <p className="text-[11px] text-muted-foreground">
              JPG, PNG, WEBP or GIF · up to 2 MB. Used on customer-facing communications.
            </p>
            {!readOnly ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => void onLogoSelected(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="text-[12px] font-semibold text-primary hover:text-primary-hover disabled:opacity-50"
                  disabled={logoBusy || clientId == null}
                  onClick={() => fileRef.current?.click()}
                >
                  {logoBusy ? "Uploading…" : c.logoUrl ? "Change logo" : "Upload logo"}
                </button>
                {c.logoUrl ? (
                  <>
                    <button
                      type="button"
                      className="text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                      disabled={logoBusy}
                      onClick={() => setPreviewOpen(true)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="text-[12px] font-medium text-muted-foreground hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                      disabled={logoBusy}
                      onClick={() => void onRemoveLogo()}
                    >
                      Remove
                    </button>
                  </>
                ) : null}
                {clientId == null ? (
                  <span className="text-[11px] text-muted-foreground">
                    Save earlier steps first to enable upload.
                  </span>
                ) : null}
              </div>
            ) : c.logoUrl ? (
              <button
                type="button"
                className="mt-2 text-[12px] font-semibold text-primary"
                onClick={() => setPreviewOpen(true)}
              >
                View logo
              </button>
            ) : null}
            {logoError ? <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">{logoError}</p> : null}
          </div>
        </div>
        <Field label="Display / Brand Name">
          <TextInput
            value={c.brandName}
            onChange={(v) => patchConfig({ brandName: v })}
            disabled={readOnly}
          />
        </Field>
        <Field label="Sender Name">
          <TextInput
            value={c.senderName}
            onChange={(v) => patchConfig({ senderName: v })}
            disabled={readOnly}
          />
        </Field>

        <div className="divide-y divide-border rounded-lg border border-border bg-card px-3">
          <ToggleRow
            label="Email"
            description="Reminders, statements and payment links"
            checked={c.channels.email}
            onChange={(v) => patchConfig({ channels: { ...c.channels, email: v } })}
            disabled={readOnly}
          />
          <ToggleRow
            label="SMS"
            description="Short reminders and payment links"
            checked={c.channels.sms}
            onChange={(v) => patchConfig({ channels: { ...c.channels, sms: v } })}
            disabled={readOnly}
          />
          <ToggleRow label="WhatsApp" badge="Coming Later" checked={false} disabled />
        </div>

        {c.channels.email && (
          <Field label="Email From Address">
            <TextInput
              value={c.emailFrom}
              onChange={(v) => patchConfig({ emailFrom: v })}
              disabled={readOnly}
            />
          </Field>
        )}
        {c.channels.sms && (
          <Field label="SMS Sender ID">
            <TextInput
              value={c.smsSenderId}
              onChange={(v) => patchConfig({ smsSenderId: v })}
              disabled={readOnly}
            />
          </Field>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-eyebrow">Customer-facing preview</p>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <div className="grid size-7 place-items-center overflow-hidden rounded bg-surface text-[11px] font-semibold">
              {logoSrc ? (
                <img src={logoSrc} alt="" className="size-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="text-[12px]">
              <p className="font-medium text-foreground">{c.senderName || brand}</p>
              <p className="text-muted-foreground">{c.emailFrom}</p>
            </div>
          </div>
          <p className="mt-3 text-[13px] font-medium text-foreground">
            Your {brand} balance is past due
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            Hello John, your outstanding balance of $4,250 is now overdue. You can settle it
            securely, or set up a payment plan that works for you.
          </p>
          <span className="mt-3 inline-block rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground">
            Pay now
          </span>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-eyebrow mb-2">SMS · {c.smsSenderId || "SENDER"}</p>
          <p className="rounded-lg bg-surface px-3 py-2 text-[12px] text-foreground">
            {brand}: your balance of $4,250 is overdue. Pay or arrange a plan here: pay.fl/x9k2
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- AI & governance ---------------- */

export function AiGovernanceSection({
  draft,
  patch,
  patchConfig,
  governanceRules = [],
  readOnly,
}: SectionProps) {
  const rules = draft.config.governanceRules;
  const library = governanceRules.length
    ? governanceRules
    : [
        "High Balance Human Review",
        "Repeated Attempts Escalation",
        "Low Confidence Review",
        "Dispute Detected Review",
        "Settlement Offer Approval",
      ];

  const toggleRule = (rule: string) =>
    patchConfig({
      governanceRules: rules.includes(rule) ? rules.filter((r) => r !== rule) : [...rules, rule],
    });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] font-semibold text-foreground">AI Operating Mode</p>
        <p className="text-[12px] text-muted-foreground">
          How should PayFlow operate collection activity for this client?
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          title="Autopilot"
          description="PayFlow performs routine collection decisions and actions autonomously within configured operating boundaries. Routine human approval is not required; security and compliance controls still apply."
          selected={draft.aiMode === "Autopilot"}
          onSelect={readOnly ? undefined : () => patch({ aiMode: "Autopilot" })}
          disabled={readOnly}
        />
        <ChoiceCard
          title="Supervised AI"
          description="PayFlow performs the operational work, while configured governance rules determine when supervisor review is required."
          selected={draft.aiMode === "Supervised AI"}
          onSelect={readOnly ? undefined : () => patch({ aiMode: "Supervised AI" })}
          disabled={readOnly}
        />
      </div>

      {draft.aiMode === "Supervised AI" && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground">Governance Rules</p>
            {!readOnly ? (
              <Link to="/payflow/rules/new" target="_blank" rel="noreferrer">
                <Btn variant="ghost" className="text-primary hover:text-primary-hover">
                  + Create Rule
                </Btn>
              </Link>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select rules for this client. Use Create Rule to open the Rule Builder in a new tab.
          </p>
          <div className="mt-3 space-y-1">
            {library.map((rule) => (
              <label
                key={rule}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-card"
              >
                <input
                  type="checkbox"
                  checked={rules.includes(rule)}
                  onChange={() => !readOnly && toggleRule(rule)}
                  disabled={readOnly}
                  className="size-3.5 rounded border-border-strong accent-[var(--color-primary)] dark:border-slate-500"
                />
                <span className="text-[13px] text-foreground">{rule}</span>
              </label>
            ))}
          </div>
          {rules.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
              {rules.map((r) => (
                <StatusPill key={r} tone="info">
                  {r}
                </StatusPill>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Supervisors only (permissions read-only) ---------------- */

export function SupervisorSection({
  draft,
  patch,
  supervisorUsers = [],
  permissionGroups = [],
  readOnly,
}: SectionProps) {
  const toggle = (userId: string) =>
    patch({
      supervisorUserIds: draft.supervisorUserIds.includes(userId)
        ? draft.supervisorUserIds.filter((id) => id !== userId)
        : [...draft.supervisorUserIds, userId],
    });

  const selectedUsers = supervisorUsers.filter((u) =>
    draft.supervisorUserIds.includes(String(u.id)),
  );

  const allCodes = permissionGroups.flatMap((g) => g.permissions.map((p) => p.code));

  function codesForUser(user: PayflowUser) {
    const fullAccess =
      (user.role_permission_names || []).includes("Full Access") ||
      user.role_scope === "platform_wide";
    return fullAccess ? allCodes : user.role_permission_codes || [];
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <p className="text-[13px] font-semibold text-foreground">Assigned Supervisors</p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Assignment decides where a supervisor works. Supervisors only see assigned clients.
          You can assign more than one.
        </p>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {supervisorUsers.length === 0 && (
            <p className="px-3 py-3 text-[13px] text-muted-foreground">
              No supervisor users available. Create a supervisor under Users &amp; Permissions first.
            </p>
          )}
          {supervisorUsers.map((user) => {
            const selected = draft.supervisorUserIds.includes(String(user.id));
            return (
              <label
                key={user.id}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => !readOnly && toggle(String(user.id))}
                  disabled={readOnly}
                  className="size-3.5 accent-[var(--color-primary)]"
                />
                <span className="text-[13px] text-foreground">{user.full_name}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {user.role_name ? `${user.role_name} · ` : ""}
                  {user.status_label || user.status}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-foreground">Permissions</p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          {selectedUsers.length === 0
            ? "Select one or more supervisors to see each person’s role permissions."
            : selectedUsers.length === 1
              ? "Read-only view of this supervisor’s role permissions. Manage these under Users & Permissions."
              : `${selectedUsers.length} supervisors selected — each person’s permissions are shown separately below.`}
        </p>

        {permissionGroups.length === 0 ? (
          <p className="rounded-lg border border-border bg-card px-3 py-3 text-[13px] text-muted-foreground">
            Permission catalog is unavailable.
          </p>
        ) : selectedUsers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card px-3 py-6 text-center text-[12.5px] text-muted-foreground">
            No supervisor selected yet.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{user.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {user.role_name || "Supervisor"} · view only
                    </p>
                  </div>
                  <StatusPill>
                    {(codesForUser(user).length || 0)} permissions
                  </StatusPill>
                </div>
                <PermissionPicker
                  groups={permissionGroups}
                  selected={codesForUser(user)}
                  disabled
                  onToggle={() => undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
