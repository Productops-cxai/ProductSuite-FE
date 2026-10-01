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
import { cn } from "../../lib/utils";
import type { PayflowClientMapping, PayflowUser } from "../../types";

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
  payflowFields?: string[];
  governanceRules?: string[];
  readOnly?: boolean;
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

export function BrandingSection({ draft, patchConfig, readOnly }: SectionProps) {
  const c = draft.config;
  const thirdParty = c.clientType === "Third Party";
  const clientBrand = c.brandName || draft.name || "Client";
  const brand = thirdParty ? "PayFlow Collections" : clientBrand;
  const initials = brand.slice(0, 2).toUpperCase();

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {thirdParty
            ? `This is a Third Party client, so customer-facing communications and the payment page use PayFlow collection-operator branding on behalf of ${clientBrand}.`
            : `This is a First Party client, so customer-facing communications and the payment page use ${clientBrand} branding.`}
        </p>
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md border border-border bg-surface text-[13px] font-semibold text-foreground">
            {initials}
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Client Logo</p>
            <p className="text-[11px] text-muted-foreground">
              Logo upload is handled during technical setup; initials are used meanwhile.
            </p>
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
            <div className="grid size-7 place-items-center rounded bg-surface text-[11px] font-semibold">
              {initials}
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
            <Btn variant="ghost" disabled>
              + Create Rule
            </Btn>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Select existing rules. Full rule authoring arrives with the Rule Builder.
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
                  className="size-3.5 accent-[var(--color-primary)]"
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
  readOnly,
}: SectionProps) {
  const toggle = (userId: string) =>
    patch({
      supervisorUserIds: draft.supervisorUserIds.includes(userId)
        ? draft.supervisorUserIds.filter((id) => id !== userId)
        : [...draft.supervisorUserIds, userId],
    });

  return (
    <div className="max-w-xl">
      <p className="text-[13px] font-semibold text-foreground">Assigned Supervisors</p>
      <p className="mb-2 text-[11px] text-muted-foreground">
        Assignment decides where a supervisor works. Selecting a person shows their role
        permissions (read-only). Permissions are managed under Users &amp; Permissions.
      </p>
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {supervisorUsers.length === 0 && (
          <p className="px-3 py-3 text-[13px] text-muted-foreground">
            No supervisor users available. Create a supervisor under Users & Permissions first.
          </p>
        )}
        {supervisorUsers.map((user) => {
          const selected = draft.supervisorUserIds.includes(String(user.id));
          const permNames = user.role_permission_names || [];
          return (
            <div key={user.id} className="px-3 py-2.5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => !readOnly && toggle(String(user.id))}
                  disabled={readOnly}
                  className="size-3.5 accent-[var(--color-primary)]"
                />
                <span className="text-[13px] text-foreground">{user.full_name}</span>
                <span className={cn("ml-auto text-[11px] text-muted-foreground")}>
                  {user.status_label || user.status}
                </span>
              </label>
              {selected ? (
                <div className="mt-2 ml-6 rounded-md border border-border bg-muted/40 px-2.5 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Permissions from {user.role_name || "role"} (view only)
                  </p>
                  {permNames.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {permNames.map((name) => (
                        <StatusPill key={name} tone="neutral">
                          {name}
                        </StatusPill>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {user.permission_profile || "No permissions on this role yet."}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
