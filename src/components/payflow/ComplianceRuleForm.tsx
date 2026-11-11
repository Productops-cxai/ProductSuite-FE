import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import {
  createComplianceRule,
  getComplianceCatalog,
  updateComplianceRule,
} from "../../api/compliance";
import { fetchCities, fetchStates } from "../../lib/geo-api";
import { cn } from "../../lib/utils";
import { Modal } from "../ui/Modal";
import {
  Btn,
  Field,
  SectionHeading,
  SelectInput,
  TextArea,
  TextInput,
  ToggleRow,
} from "./lovable/payflow-ui";
import type {
  ComplianceCatalog,
  ComplianceConfigValue,
  ComplianceFieldSpec,
  ComplianceRule,
  ComplianceRuleWrite,
} from "../../types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function complianceStatusTone(status: string) {
  if (status === "Active") return "success" as const;
  if (status === "Pending Review" || status === "Draft") return "warning" as const;
  if (status === "Scheduled") return "info" as const;
  if (status === "Expired") return "danger" as const;
  return "neutral" as const;
}

export function emptyComplianceDraft(category = ""): ComplianceRuleWrite {
  return {
    name: "",
    category,
    description: "",
    classification: "Mandatory",
    regulatory_authority: "",
    legal_reference: "",
    effective_date: "",
    expiry_date: "",
    country: "",
    states: [],
    regions: [],
    cities: [],
    postal_codes: [],
    collector_types: [],
    debt_types: [],
    channels: [],
    applicability_conditions: "",
    configuration: {},
    action: "Block",
    override_allowed: false,
    override_authorization_level: "",
    override_reason_required: false,
    intent: "draft",
  };
}

export function draftFromRule(rule: ComplianceRule): ComplianceRuleWrite {
  return {
    name: rule.name,
    category: rule.category,
    description: rule.description || "",
    classification: rule.classification,
    regulatory_authority: rule.regulatory_authority || "",
    legal_reference: rule.legal_reference || "",
    effective_date: rule.effective_date || "",
    expiry_date: rule.expiry_date || "",
    country: rule.country,
    states: rule.states || [],
    regions: rule.regions || [],
    cities: rule.cities || [],
    postal_codes: rule.postal_codes || [],
    collector_types: rule.collector_types || [],
    debt_types: rule.debt_types || [],
    channels: rule.channels || [],
    applicability_conditions: rule.applicability_conditions || "",
    configuration: { ...(rule.configuration || {}) },
    action: rule.action,
    override_allowed: rule.override_allowed,
    override_authorization_level: rule.override_authorization_level || "",
    override_reason_required: rule.override_reason_required,
    intent: "save",
  };
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function CheckList({
  options,
  value,
  onChange,
  disabled,
  empty,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  empty: string;
}) {
  if (!options.length) {
    return <p className="text-[12.5px] text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-border bg-card p-2">
      {options.map((option) => {
        const checked = value.some((item) => item.toLowerCase() === option.toLowerCase());
        return (
          <label key={option} className="flex items-center gap-2 px-1 py-1 text-[13px]">
            <input
              type="checkbox"
              className="size-3.5 accent-[var(--color-primary)]"
              checked={checked}
              disabled={disabled}
              onChange={() => {
                onChange(
                  checked ? value.filter((item) => item.toLowerCase() !== option.toLowerCase()) : [...value, option],
                );
              }}
            />
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function TagsField({
  value,
  onChange,
  disabled,
  placeholder = "Separate multiple values with commas",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(value.join(", "));
  return (
    <TextInput
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(next) => {
        setText(next);
        onChange(splitTags(next));
      }}
    />
  );
}

const controlClass =
  "h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground shadow-subtle outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:opacity-60";

/** Short explanations for the rule-topic cards. Unknown catalog names fall back. */
const CATEGORY_BLURBS: Record<string, string> = {
  "Communication Hours": "Only send messages during allowed local hours.",
  "Allowed Days": "Choose which days of the week contact is allowed.",
  "Holiday Restrictions": "Don't contact customers on holidays or blocked dates.",
  "Contact Attempts": "Limit how many times a customer can be contacted.",
  "Contact Frequency": "Limit how often a customer can be contacted.",
  "Cooling Period": "Wait a set time after an event before contacting again.",
  "Communication Channels": "Allow or restrict specific contact channels.",
  Consent: "Only contact people who gave the required consent.",
  "Opt-Out": "Stop contact when a customer opts out.",
  "Cease Communication": "Stop contact when the customer asks you to stop.",
  "Attorney Representation": "Route or stop contact when a lawyer represents the customer.",
  "Workplace Contact": "Limit contact at a customer's workplace.",
  "Third-Party Contact": "Control what can be said to someone other than the customer.",
  "Initial Notice": "Send the required first notice before collecting.",
  "Waiting Period": "Wait after a notice or event before contacting.",
  "Debt Validation": "Hold collection until the debt is validated.",
  "Dispute Management": "Pause contact while a dispute is open.",
  "Time-Barred Debt": "Restrict collection on debt that is out of time.",
  "Fees & Charges": "Limit which fees can be added or collected.",
  "Collector Identification": "Require the sender to identify themselves.",
  Licensing: "Require a valid collector license for the jurisdiction.",
  "Customer Preferences": "Honor the customer's preferred days, time, and channel.",
  "Communication Content": "Text every message must include, or must not include.",
  "Communication Cost": "Stop contact methods that charge the customer.",
  "Record Retention": "Keep required records for a set number of days.",
  "Consent & Opt-Out": "Only contact people who agreed, and stop when they opt out.",
  "Reply Handling": "What to do when a customer replies or texts STOP/HELP.",
  Frequency: "Limit how often a customer can be contacted.",
  "Permitted Hours": "Only send messages during allowed local hours.",
  "Holidays & Restricted Dates": "Don't contact customers on holidays or blocked dates.",
  Content: "Text every message must include, like opt-out wording.",
  "Contact Restrictions": "Stop contact in special situations (e.g. dispute, hardship).",
  "Notice & Waiting Periods": "Send required notices first and wait before contacting.",
  "Additional Controls": "Record keeping and other safeguards.",
};

function plainScope(draft: ComplianceRuleWrite) {
  const place =
    [draft.country, ...draft.states, ...draft.regions].filter(Boolean).join(" / ") || "any location";
  const channel = draft.channels.length ? draft.channels.join(", ") : "any channel";
  const category = draft.category || "compliance";
  const action = (draft.action || "apply").toLowerCase();
  return { place, channel, category, action };
}

function StepHeading({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={controlClass}
    />
  );
}

function MultiSelect({
  value,
  options,
  onChange,
  placeholder = "Select",
  empty = "No options",
  disabled,
}: {
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  empty?: string;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label = value.length ? value.join(", ") : "";

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(controlClass, "flex items-center justify-between gap-2 text-left")}
      >
        <span className={cn("truncate", !label && "text-muted-foreground")}>{label || placeholder}</span>
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-panel"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-muted-foreground">{empty}</p>
          ) : (
            options.map((option) => {
              const checked = value.some((item) => item.toLowerCase() === option.toLowerCase());
              return (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-surface"
                >
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[var(--color-primary)]"
                    checked={checked}
                    onChange={() => {
                      onChange(
                        checked
                          ? value.filter((item) => item.toLowerCase() !== option.toLowerCase())
                          : [...value, option],
                      );
                    }}
                  />
                  <span className="min-w-0">{option}</span>
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function jurisdictionScope(draft: ComplianceRuleWrite) {
  if (!draft.country) return "Choose a country to set the jurisdiction scope.";
  const parts = [draft.country];
  parts.push(draft.states.length ? draft.states.join(", ") : "all states / provinces");
  if (draft.regions.length) parts.push(draft.regions.join(", "));
  if (draft.cities.length) parts.push(draft.cities.join(", "));
  if (draft.postal_codes.length) parts.push(draft.postal_codes.join(", "));
  const level = draft.cities.length || draft.regions.length || draft.postal_codes.length
    ? "Local"
    : draft.states.length
      ? "State / province"
      : "Federal";
  return `${level} scope · ${parts.join(" · ")}`;
}

function localIssues(draft: ComplianceRuleWrite, catalog: ComplianceCatalog, strict: boolean) {
  const issues: string[] = [];
  if (!draft.name.trim()) issues.push("Rule name is required.");
  if (!draft.category) issues.push("Rule category is required.");
  if (!draft.classification) issues.push("Rule classification is required.");
  if (!draft.country) issues.push("Country is required.");
  if (!draft.action) issues.push("Enforcement action is required.");
  if (draft.effective_date && draft.expiry_date && draft.expiry_date < draft.effective_date) {
    issues.push("Expiry date must be on or after the effective date.");
  }
  const category = catalog.categories.find((item) => item.name === draft.category);
  const start = String(draft.configuration.start_time || "");
  const end = String(draft.configuration.end_time || "");
  if (start && end && start >= end) issues.push("End time must be later than start time.");
  if (strict && category) {
    if (!draft.legal_reference.trim()) issues.push("Legal reference / source is required.");
    if (!draft.effective_date) issues.push("Effective date is required.");
    if (!draft.channels.length) issues.push("Select at least one communication channel.");
    for (const field of category.fields) {
      if (!field.required) continue;
      const value = draft.configuration[field.key];
      const empty =
        value == null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty) issues.push(`${field.label} is required.`);
    }
  }
  if (draft.override_allowed && !draft.override_authorization_level) {
    issues.push("Select an override authorization level.");
  }
  return issues;
}

function ConfigField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ComplianceFieldSpec;
  value: ComplianceConfigValue | undefined;
  disabled?: boolean;
  onChange: (next: ComplianceConfigValue) => void;
}) {
  if (field.type === "textarea") {
    return (
      <TextArea
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        onChange={(next) => onChange(next)}
      />
    );
  }
  if (field.type === "number") {
    return (
      <TextInput
        value={value == null || value === "" ? "" : String(value)}
        disabled={disabled}
        onChange={(next) => onChange(next.trim() === "" ? "" : Number(next))}
      />
    );
  }
  if (field.type === "time") {
    return (
      <input
        type="time"
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px]"
      />
    );
  }
  if (field.type === "select") {
    return (
      <SelectInput
        value={typeof value === "string" ? value : ""}
        options={["", ...field.options]}
        disabled={disabled}
        onChange={(next) => onChange(next)}
      />
    );
  }
  if (field.type === "multiselect") {
    return (
      <CheckList
        options={field.options}
        value={Array.isArray(value) ? value.map(String) : []}
        disabled={disabled}
        empty="No options are configured."
        onChange={(next) => onChange(next)}
      />
    );
  }
  if (field.type === "tags") {
    return (
      <TagsField
        value={Array.isArray(value) ? value.map(String) : []}
        disabled={disabled}
        onChange={(next) => onChange(next)}
      />
    );
  }
  if (field.type === "weekdays") {
    const days = Array.isArray(value) ? value.map((item) => Number(item)) : [];
    return (
      <div className="flex flex-wrap gap-3">
        {WEEKDAY_LABELS.map((label, index) => (
          <label key={label} className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              className="size-3.5 accent-[var(--color-primary)]"
              checked={days.includes(index)}
              disabled={disabled}
              onChange={(event) => {
                onChange(
                  event.target.checked
                    ? [...days, index].sort((a, b) => a - b)
                    : days.filter((day) => day !== index),
                );
              }}
            />
            {label}
          </label>
        ))}
      </div>
    );
  }
  return (
    <TextInput
      value={typeof value === "string" ? value : ""}
      disabled={disabled}
      onChange={(next) => onChange(next)}
    />
  );
}

type RuleCondition = {
  id: string;
  field: string;
  operator: string;
  value: string;
  days: string;
};

const CONDITION_FIELDS = [
  "Consent",
  "Opt-Out",
  "Contact Attempts",
  "Outside Permitted Hours",
  "Restricted Date",
  "Do Not Contact",
  "Cease Communication",
  "Disputed Debt",
  "Legal Representation",
  "Bankruptcy",
  "Deceased",
  "Hardship",
  "Third-Party Contact",
  "Sender Identified",
  "Unsubscribe Instructions",
  "Template Approved",
  "Reply Handling Enabled",
  "Language",
  "Communication Type",
  "Outstanding Balance",
  "Days Past Due",
  "Days Since Last Contact",
  "Days Since Conversation",
  "Channel Permitted",
  "Workplace Contact",
  "Employer Email",
  "Written Notice Sent",
  "Days Since Notice",
  "Validation Notice Sent",
  "Accounting Request Overdue",
  "Time-Barred Debt",
  "Unauthorized Fee",
  "Collector Licensed",
  "Outside Customer Preference",
  "Chargeable Method",
];

const CONDITION_OPERATORS = ["Equals", "Greater Than", "Less Than", "Between", "Includes", "Excludes"];

function conditionClause(row: RuleCondition) {
  const days = Number(row.days);
  const window = Number.isFinite(days) && days > 0 ? ` / rolling ${days} days` : "";
  return `${row.field} ${row.operator.toLowerCase()} ${row.value.trim()}${window}`;
}

function conditionsText(logic: "AND" | "OR", rows: RuleCondition[]) {
  return rows.map(conditionClause).join(` ${logic} `);
}

function conditionsSummary(logic: "AND" | "OR", rows: RuleCondition[]) {
  return rows
    .map((row) => `${row.field} ${row.operator.toLowerCase()} ${row.value.trim()}`)
    .join(` ${logic} `);
}

function RuleConditionEditor({
  place,
  action,
  onText,
}: {
  place: string;
  action: string;
  onText: (text: string) => void;
}) {
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [rows, setRows] = useState<RuleCondition[]>([
    { id: "c1", field: "Consent", operator: "Equals", value: "No", days: "7" },
  ]);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    onTextRef.current(conditionsText(logic, rows));
  }, [logic, rows]);

  function update(id: string, partial: Partial<RuleCondition>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...partial } : row)));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[13.5px] font-semibold tracking-tight text-foreground">Rule conditions</h4>
        <Btn
          onClick={() =>
            setRows((current) => [
              ...current,
              {
                id: `c-${current.length}-${Date.now()}`,
                field: "Consent",
                operator: "Equals",
                value: "No",
                days: "7",
              },
            ])
          }
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add condition
        </Btn>
      </div>
      <div className="mb-3 max-w-xs">
        <Field label="Match conditions">
          <select
            value={logic}
            onChange={(event) => setLogic(event.target.value === "OR" ? "OR" : "AND")}
            className={controlClass}
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </Field>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid items-end gap-2 border-b border-border pb-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_5.5rem_2.25rem]"
          >
            <Field label="Condition Type">
              <select
                value={row.field}
                onChange={(event) => update(row.id, { field: event.target.value })}
                className={controlClass}
              >
                {CONDITION_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Operator">
              <select
                value={row.operator}
                onChange={(event) => update(row.id, { operator: event.target.value })}
                className={controlClass}
              >
                {CONDITION_OPERATORS.map((operator) => (
                  <option key={operator} value={operator}>
                    {operator}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Value">
              <TextInput value={row.value} onChange={(value) => update(row.id, { value })} />
            </Field>
            <Field label="Days">
              <TextInput
                value={row.days}
                onChange={(days) => update(row.id, { days: days.replace(/[^\d]/g, "") })}
              />
            </Field>
            <button
              type="button"
              disabled={rows.length < 2}
              aria-label="Remove condition"
              onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
              className="mb-0.5 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-md bg-surface p-3 text-xs leading-relaxed text-foreground">
        If recipient is in {place} AND {conditionsSummary(logic, rows)}, then {action} the communication.
      </p>
    </div>
  );
}

function GuidedCreateFields({
  catalog,
  category,
  draft,
  states,
  cities,
  geoError,
  error,
  activeWarning,
  allowDraft,
  disabled,
  patch,
  setConfig,
  requestSave,
}: {
  catalog: ComplianceCatalog | null;
  category: ComplianceCatalog["categories"][number] | undefined;
  draft: ComplianceRuleWrite;
  states: string[];
  cities: string[];
  geoError: string;
  error: string;
  activeWarning?: boolean;
  allowDraft?: boolean;
  disabled?: boolean;
  patch: (partial: Partial<ComplianceRuleWrite>) => void;
  setConfig: (key: string, value: ComplianceConfigValue) => void;
  requestSave: (intent: ComplianceRuleWrite["intent"]) => void;
}) {
  const [template, setTemplate] = useState("");
  const words = plainScope(draft);
  const categories = catalog?.categories ?? [];
  const configTitle = draft.category || "Rule details";
  const place =
    [draft.country, ...draft.states, ...draft.regions, ...draft.postal_codes].filter(Boolean).join(" / ") ||
    "any location";

  function chooseCategory(name: string) {
    if (name === draft.category) return;
    patch({ category: name, configuration: {} });
  }

  return (
    <>
      {activeWarning ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-[13px] text-foreground">
          This rule is active. Saving changes can affect associated clients and future collection activity.
        </p>
      ) : null}

      <div className="max-w-xl">
        <Field label="Start from a rule type (optional)">
          <select
            value={template}
            onChange={(event) => {
              const next = event.target.value;
              setTemplate(next);
              if (next) chooseCategory(next);
            }}
            className={controlClass}
          >
            <option value=""> </option>
            {categories.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {template
            ? `${template} — ${CATEGORY_BLURBS[template] ?? "Other compliance controls."} Default action: ${draft.action || "Block"}.`
            : "Pick a rule type to pre-fill the form, or start blank for any new kind of rule."}
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">In plain words</p>
        <p className="mt-1 leading-relaxed">
          For customers in <strong className="font-semibold">{words.place}</strong> contacted by{" "}
          <strong className="font-semibold">{words.channel}</strong>, this{" "}
          <strong className="font-semibold">{words.category}</strong> rule will{" "}
          <strong className="font-semibold">{words.action}</strong> the message when it applies.
        </p>
      </div>

      <section>
        <StepHeading
          step={1}
          title="What kind of rule is this?"
          description="Pick the topic that best matches what you want to control."
        />
        {!catalog ? (
          <p className="text-[13px] text-muted-foreground">
            {error ? "Rule topics could not be loaded." : "Loading categories…"}
          </p>
        ) : categories.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No rule topics are available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((item) => {
              const selected = item.name === draft.category;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => chooseCategory(item.name)}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-surface",
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {CATEGORY_BLURBS[item.name] ?? "Other compliance controls."}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <StepHeading
          step={2}
          title="Name it and choose where it applies"
          description="Location and channel decide which customers this rule covers."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rule name" hint="A short name your team will recognise">
            <TextInput value={draft.name} onChange={(name) => patch({ name })} />
          </Field>
          <Field label="Channel">
            <MultiSelect
              value={draft.channels}
              options={catalog?.channels || []}
              placeholder="Select channel"
              empty="Channels are unavailable."
              onChange={(channels) => patch({ channels })}
            />
          </Field>
          <Field label="Country">
            <SelectInput
              value={draft.country}
              options={["", ...(catalog?.countries || [])]}
              onChange={(country) => patch({ country, states: [], cities: [] })}
            />
          </Field>
          <Field label="State / Province">
            <MultiSelect
              value={draft.states}
              options={states}
              placeholder=""
              empty={draft.country ? "Loading states…" : "Select a country first."}
              onChange={(next) =>
                patch({ states: next, cities: draft.cities.filter(() => next.length > 0) })
              }
            />
          </Field>
          <Field label="Region">
            <TagsField
              value={draft.regions}
              placeholder="Any region"
              onChange={(regions) => patch({ regions })}
            />
          </Field>
          <Field label="Postal Code / Range" hint="Prefix or range, e.g. M5 or 10001..10010">
            <TagsField
              value={draft.postal_codes}
              placeholder=""
              onChange={(postal_codes) => patch({ postal_codes })}
            />
          </Field>
          <Field label="City">
            <MultiSelect
              value={draft.cities}
              options={cities}
              placeholder="Any city"
              empty={
                draft.states.length
                  ? "No cities were returned for the selected states."
                  : "Select one or more states to load cities."
              }
              onChange={(next) => patch({ cities: next })}
            />
          </Field>
        </div>
        {geoError ? <p className="mt-2 text-[12.5px] text-destructive">{geoError}</p> : null}
      </section>

      <section>
        <StepHeading
          step={3}
          title="What should happen?"
          description="Choose what PayFlow does when this rule applies, then fill in the details."
        />
        <div className="max-w-md">
          <Field label="Action">
            <SelectInput
              value={draft.action}
              options={catalog?.actions || [draft.action].filter(Boolean)}
              onChange={(action) => patch({ action })}
            />
          </Field>
        </div>
        {category && category.fields.length > 0 ? (
          <div className="mt-4">
            <h4 className="mb-3 text-[13.5px] font-semibold tracking-tight text-foreground">{configTitle}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {category.fields.map((field) => (
                <Field
                  key={`${draft.category}-${field.key}`}
                  label={field.label}
                  hint={field.required ? "Required before review" : undefined}
                  className={field.type === "textarea" || field.type === "weekdays" ? "sm:col-span-2" : undefined}
                >
                  <ConfigField
                    field={field}
                    value={draft.configuration[field.key]}
                    onChange={(next) => setConfig(field.key, next)}
                  />
                </Field>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <details open className="group rounded-lg border border-border bg-card p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-start gap-2 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 size-4 shrink-0 -rotate-90 text-muted-foreground transition-transform group-open:rotate-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          <span className="min-w-0 leading-snug">
            Advanced settings{" "}
            <span className="font-normal text-muted-foreground">
              — optional: conditions, legal references, enforcement, dates
            </span>
          </span>
        </summary>

        <div className="mt-5 space-y-7">
          <div>
            <h4 className="mb-3 text-[13.5px] font-semibold tracking-tight text-foreground">Details & references</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rule ID">
                <TextInput value="Assigned when saved" disabled onChange={() => undefined} />
              </Field>
              <Field label="Regulatory Reference">
                <TextInput
                  value={draft.legal_reference}
                  onChange={(legal_reference) => patch({ legal_reference })}
                />
              </Field>
              <Field label="Description">
                <TextInput value={draft.description} onChange={(description) => patch({ description })} />
              </Field>
              <Field label="Regulatory authority">
                <TextInput
                  value={draft.regulatory_authority}
                  onChange={(regulatory_authority) => patch({ regulatory_authority })}
                />
              </Field>
            </div>
          </div>

          <div>
            <RuleConditionEditor
              place={place}
              action={words.action}
              onText={(applicability_conditions) => patch({ applicability_conditions })}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Collector type">
                <MultiSelect
                  value={draft.collector_types}
                  options={catalog?.collector_types || []}
                  placeholder="Any collector type"
                  empty="Collector types are unavailable."
                  onChange={(collector_types) => patch({ collector_types })}
                />
              </Field>
              <Field label="Debt type">
                <MultiSelect
                  value={draft.debt_types}
                  options={catalog?.debt_types || []}
                  placeholder="Any debt type"
                  empty="Debt types are unavailable."
                  onChange={(debt_types) => patch({ debt_types })}
                />
              </Field>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-[13.5px] font-semibold tracking-tight text-foreground">
              Enforcement & lifecycle
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Enforcement">
                <SelectInput
                  value={draft.classification}
                  options={catalog?.classifications || [draft.classification].filter(Boolean)}
                  onChange={(classification) => patch({ classification })}
                />
              </Field>
              <Field label="Effective From">
                <DateInput
                  value={draft.effective_date || ""}
                  onChange={(effective_date) => patch({ effective_date })}
                />
              </Field>
              <Field label="Effective Until">
                <DateInput
                  value={draft.expiry_date || ""}
                  onChange={(expiry_date) => patch({ expiry_date })}
                />
              </Field>
              <Field label="Override authorization level" className="sm:col-span-2 lg:col-span-1">
                <SelectInput
                  value={draft.override_authorization_level}
                  options={["", ...(catalog?.override_levels || [])]}
                  disabled={!draft.override_allowed}
                  onChange={(override_authorization_level) => patch({ override_authorization_level })}
                />
              </Field>
            </div>
            <div className="mt-1 divide-y divide-border/70">
              <ToggleRow
                label="Override allowed"
                checked={draft.override_allowed}
                onChange={(override_allowed) =>
                  patch({
                    override_allowed,
                    override_authorization_level: override_allowed ? draft.override_authorization_level : "",
                  })
                }
              />
              <ToggleRow
                label="Override reason required"
                checked={draft.override_reason_required}
                onChange={(override_reason_required) => patch({ override_reason_required })}
              />
            </div>
          </div>
        </div>
      </details>

      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      {!disabled ? (
        <div className="flex flex-wrap gap-2">
          {allowDraft ? (
            <Btn variant="primary" onClick={() => requestSave("draft")}>
              Save Compliance Rule
            </Btn>
          ) : null}
          {allowDraft ? (
            <Btn onClick={() => requestSave("submit")}>Submit for Review</Btn>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function ComplianceRuleForm({
  mode,
  ruleId,
  initial,
  activeWarning,
  allowDraft,
  disabled,
  onSaved,
}: {
  mode: "create" | "edit";
  ruleId?: number;
  initial: ComplianceRuleWrite;
  activeWarning?: boolean;
  allowDraft?: boolean;
  disabled?: boolean;
  onSaved: (rule: ComplianceRule) => void;
}) {
  const [catalog, setCatalog] = useState<ComplianceCatalog | null>(null);
  const [draft, setDraft] = useState<ComplianceRuleWrite>(initial);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [geoError, setGeoError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getComplianceCatalog()
      .then((next) => {
        if (cancelled) return;
        setCatalog(next);
        setDraft((current) => ({
          ...current,
          category: current.category || next.categories[0]?.name || "",
          classification: current.classification || next.classifications[0] || "Mandatory",
          action: current.action || next.actions[0] || "Block",
        }));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load the rule catalog");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draft.country) {
      setStates([]);
      return;
    }
    let cancelled = false;
    setGeoError("");
    fetchStates(draft.country)
      .then((rows) => {
        if (!cancelled) setStates(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setStates([]);
          setGeoError(err instanceof ApiError ? err.detail : "Could not load states and provinces.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draft.country]);

  useEffect(() => {
    if (!draft.country || draft.states.length === 0) {
      setCities([]);
      return;
    }
    let cancelled = false;
    Promise.all(draft.states.map((state) => fetchCities(draft.country, state).catch(() => [] as string[])))
      .then((groups) => {
        if (cancelled) return;
        const merged = Array.from(new Set(groups.flat())).sort((a, b) => a.localeCompare(b));
        setCities(merged);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.country, draft.states]);

  const category = useMemo(
    () => catalog?.categories.find((item) => item.name === draft.category),
    [catalog, draft.category],
  );

  function patch(partial: Partial<ComplianceRuleWrite>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function setConfig(key: string, value: ComplianceConfigValue) {
    setDraft((current) => ({
      ...current,
      configuration: { ...current.configuration, [key]: value },
    }));
  }

  async function persist(intent: ComplianceRuleWrite["intent"]) {
    if (!catalog) return;
    const strict = intent === "submit";
    const issues = localIssues(draft, catalog, strict);
    if (issues.length) {
      setError(issues[0]);
      return;
    }
    setBusy(true);
    setError("");
    const payload: ComplianceRuleWrite = {
      ...draft,
      effective_date: draft.effective_date || null,
      expiry_date: draft.expiry_date || null,
      intent,
    };
    try {
      const saved =
        mode === "create" || ruleId == null
          ? await createComplianceRule(payload)
          : await updateComplianceRule(ruleId, payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "The rule could not be saved.");
    } finally {
      setBusy(false);
      setConfirmSave(false);
    }
  }

  function requestSave(intent: ComplianceRuleWrite["intent"]) {
    if (activeWarning && intent === "save") {
      setConfirmSave(true);
      return;
    }
    void persist(intent);
  }

  const confirmModal = (
    <Modal
      title="Save active rule?"
      description="Changes apply to associated clients and future collection activity."
      open={confirmSave}
      onClose={() => setConfirmSave(false)}
      footer={
        <div className="flex justify-end gap-2">
          <Btn onClick={() => setConfirmSave(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void persist("save")}>
            Save changes
          </Btn>
        </div>
      }
    >
      <p className="text-[13px] text-muted-foreground">
        Confirm only if this update should remain in effect for every client covered by the rule.
      </p>
    </Modal>
  );

  if (mode === "create") {
    return (
      <fieldset disabled={disabled || busy} className="min-w-0 space-y-7">
        <GuidedCreateFields
          catalog={catalog}
          category={category}
          draft={draft}
          states={states}
          cities={cities}
          geoError={geoError}
          error={error}
          activeWarning={activeWarning}
          allowDraft={allowDraft}
          disabled={disabled}
          patch={patch}
          setConfig={setConfig}
          requestSave={requestSave}
        />
        {confirmModal}
      </fieldset>
    );
  }

  return (
    <fieldset disabled={disabled || busy} className="space-y-8">
      {activeWarning ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-[13px] text-foreground">
          This rule is active. Saving changes can affect associated clients and future collection activity.
        </p>
      ) : null}
      <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-[13px] text-foreground">
        {jurisdictionScope(draft)}
      </p>

      <section className="space-y-3">
        <SectionHeading title="Basic information" description="Name the rule and record where the requirement comes from." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rule name">
            <TextInput value={draft.name} onChange={(name) => patch({ name })} />
          </Field>
          <Field label="Rule category">
            <SelectInput
              value={draft.category}
              options={catalog?.categories.map((item) => item.name) || [draft.category].filter(Boolean)}
              onChange={(category) => patch({ category, configuration: {} })}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <TextArea value={draft.description} onChange={(description) => patch({ description })} />
          </Field>
          <Field label="Rule classification">
            <SelectInput
              value={draft.classification}
              options={catalog?.classifications || [draft.classification]}
              onChange={(classification) => patch({ classification })}
            />
          </Field>
          <Field label="Regulatory authority">
            <TextInput
              value={draft.regulatory_authority}
              onChange={(regulatory_authority) => patch({ regulatory_authority })}
            />
          </Field>
          <Field label="Legal reference / source" className="sm:col-span-2">
            <TextInput
              value={draft.legal_reference}
              onChange={(legal_reference) => patch({ legal_reference })}
            />
          </Field>
          <Field label="Effective date">
            <input
              type="date"
              value={draft.effective_date || ""}
              onChange={(event) => patch({ effective_date: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px]"
            />
          </Field>
          <Field label="Expiry date" hint="Optional">
            <input
              type="date"
              value={draft.expiry_date || ""}
              onChange={(event) => patch({ expiry_date: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px]"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading
          title="Jurisdiction"
          description="Leave state, city, region, or postal code empty to cover every value at that level."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Country">
            <SelectInput
              value={draft.country}
              options={["", ...(catalog?.countries || [])]}
              onChange={(country) => patch({ country, states: [], cities: [] })}
            />
          </Field>
          <Field label="State / province">
            <CheckList
              options={states}
              value={draft.states}
              empty={draft.country ? "Loading states…" : "Select a country first."}
              onChange={(next) => patch({ states: next, cities: draft.cities.filter(() => next.length > 0) })}
            />
          </Field>
          <Field label="Region" hint="Multiple regions, separated by commas">
            <TagsField value={draft.regions} onChange={(regions) => patch({ regions })} />
          </Field>
          <Field label="City">
            <CheckList
              options={cities}
              value={draft.cities}
              empty={
                draft.states.length
                  ? "No cities were returned for the selected states."
                  : "Select one or more states to load cities."
              }
              onChange={(next) => patch({ cities: next })}
            />
          </Field>
          <Field label="Postal / ZIP code" hint="Prefixes or ranges, for example M5 or 10001..10010" className="sm:col-span-2">
            <TagsField value={draft.postal_codes} onChange={(postal_codes) => patch({ postal_codes })} />
          </Field>
        </div>
        {geoError ? <p className="text-[12.5px] text-destructive">{geoError}</p> : null}
      </section>

      <section className="space-y-3">
        <SectionHeading title="Applicability" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Collector type">
            <CheckList
              options={catalog?.collector_types || []}
              value={draft.collector_types}
              empty="Collector types are unavailable."
              onChange={(collector_types) => patch({ collector_types })}
            />
          </Field>
          <Field label="Debt type">
            <CheckList
              options={catalog?.debt_types || []}
              value={draft.debt_types}
              empty="Debt types are unavailable."
              onChange={(debt_types) => patch({ debt_types })}
            />
          </Field>
          <Field label="Communication channel" className="sm:col-span-2">
            <CheckList
              options={catalog?.channels || []}
              value={draft.channels}
              empty="Channels are unavailable."
              onChange={(channels) => patch({ channels })}
            />
          </Field>
          <Field label="Applicability conditions" className="sm:col-span-2">
            <TextArea
              value={draft.applicability_conditions}
              onChange={(applicability_conditions) => patch({ applicability_conditions })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading
          title="Rule configuration"
          description={category ? `Fields for ${category.name}.` : "Select a category to show its fields."}
        />
        {category ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {category.fields.map((field) => (
              <Field key={`${draft.category}-${field.key}`} label={field.label} hint={field.required ? "Required before review" : undefined}>
                <ConfigField
                  field={field}
                  value={draft.configuration[field.key]}
                  onChange={(next) => setConfig(field.key, next)}
                />
              </Field>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">Loading categories…</p>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeading title="Enforcement" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Action">
            <SelectInput
              value={draft.action}
              options={catalog?.actions || [draft.action]}
              onChange={(action) => patch({ action })}
            />
          </Field>
          <Field label="Override authorization level">
            <SelectInput
              value={draft.override_authorization_level}
              options={["", ...(catalog?.override_levels || [])]}
              disabled={!draft.override_allowed}
              onChange={(override_authorization_level) => patch({ override_authorization_level })}
            />
          </Field>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              className="size-3.5 accent-[var(--color-primary)]"
              checked={draft.override_allowed}
              onChange={(event) =>
                patch({
                  override_allowed: event.target.checked,
                  override_authorization_level: event.target.checked ? draft.override_authorization_level : "",
                })
              }
            />
            Override allowed
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              className="size-3.5 accent-[var(--color-primary)]"
              checked={draft.override_reason_required}
              onChange={(event) => patch({ override_reason_required: event.target.checked })}
            />
            Override reason required
          </label>
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      {!disabled ? (
        <div className="flex flex-wrap gap-2">
          {allowDraft ? (
            <Btn onClick={() => requestSave("draft")}>Save as Draft</Btn>
          ) : null}
          {mode === "edit" ? (
            <Btn variant="primary" onClick={() => requestSave("save")}>
              Save changes
            </Btn>
          ) : null}
          {allowDraft ? (
            <Btn variant="primary" onClick={() => requestSave("submit")}>
              Submit for Review
            </Btn>
          ) : null}
        </div>
      ) : null}

      {confirmModal}
    </fieldset>
  );
}
