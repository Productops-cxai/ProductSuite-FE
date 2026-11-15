import type {
  ComplianceApiRule,
  ComplianceCatalog,
  ComplianceConditionDraft,
  ComplianceConfigValue,
  ComplianceFieldSpec,
  ComplianceRuleSaveBody,
  ComplianceRuleTypeOption,
  ComplianceRuleWrite,
} from "../types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function emptyComplianceDraft(category = ""): ComplianceRuleWrite {
  return {
    name: "",
    rule_type: "",
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
    logic: "AND",
    conditions: [],
    applicability_conditions: "",
    configuration: {},
    action: "Block",
    override_allowed: false,
    override_authorization_level: "",
    override_reason_required: false,
    change_reason: "",
    intent: "draft",
  };
}

export function conditionsFromApi(raw: Record<string, unknown>[] | undefined): ComplianceConditionDraft[] {
  return (raw || [])
    .map((item, index) => ({
      id: String(item.id || `c${index + 1}`),
      field: String(item.field || ""),
      operator: String(item.operator || "Equals"),
      value: item.value == null ? "" : String(item.value),
      period: Number(item.period || 7) || 7,
    }))
    .filter((item) => item.field);
}

export function draftFromApiRule(rule: ComplianceApiRule): ComplianceRuleWrite {
  const policy = rule.override_policy || "Not Permitted";
  const allowed = policy !== "Not Permitted" && policy !== "";
  const settings = (rule.settings || {}) as Record<string, ComplianceConfigValue>;
  return {
    ...emptyComplianceDraft(rule.category),
    name: rule.name || "",
    rule_type: rule.rule_type || "",
    category: rule.category || "",
    description: rule.description || "",
    classification: rule.enforcement || "Mandatory",
    regulatory_authority: rule.regulatory_authority || "",
    legal_reference: rule.legal_reference || "",
    effective_date: rule.effective_from || "",
    expiry_date: rule.effective_until || "",
    country: rule.country || "",
    states: rule.state ? [rule.state] : [],
    regions: rule.region ? [rule.region] : [],
    cities: rule.city ? [rule.city] : [],
    postal_codes: rule.postal ? [rule.postal] : [],
    collector_types: rule.collector_type ? [rule.collector_type] : [],
    debt_types: rule.debt_type ? [rule.debt_type] : [],
    channels: rule.channel ? [rule.channel] : [],
    logic: rule.logic === "OR" ? "OR" : "AND",
    conditions: conditionsFromApi(rule.conditions),
    configuration: { ...settings },
    action: rule.action || "Block",
    override_allowed: allowed,
    override_authorization_level: allowed ? policy : "",
    override_reason_required: policy === "Operations Admin With Reason",
    intent: "save",
  };
}

export function fieldsForRuleType(type: ComplianceRuleTypeOption | undefined): ComplianceFieldSpec[] {
  if (!type) return [];
  const needs = type.needs || [];
  const fields: ComplianceFieldSpec[] = [];
  if (needs.includes("hours")) {
    fields.push(
      { key: "start", label: "Start time", type: "time", required: true, options: [] },
      { key: "end", label: "End time", type: "time", required: true, options: [] },
      { key: "days", label: "Permitted days", type: "weekdays", required: true, options: [] },
    );
  } else if (needs.includes("days")) {
    fields.push({ key: "days", label: "Allowed days", type: "weekdays", required: true, options: [] });
  }
  if (needs.includes("limit")) {
    fields.push(
      { key: "interval_hours", label: "Minimum interval (hours)", type: "number", required: false, options: [] },
      { key: "daily", label: "Daily limit", type: "number", required: false, options: [] },
      { key: "weekly", label: "Weekly limit", type: "number", required: false, options: [] },
      { key: "monthly", label: "Monthly limit", type: "number", required: false, options: [] },
    );
  }
  if (needs.includes("retention")) {
    fields.push({
      key: "retention_days",
      label: "Retention period (days)",
      type: "number",
      required: true,
      options: [],
    });
  }
  if (needs.includes("text")) {
    fields.push({ key: "required_text", label: "Required text", type: "textarea", required: true, options: [] });
  }
  return fields;
}

function oneValue(label: string, values: string[], issues: string[]) {
  if (values.length > 1) issues.push(`${label} accepts a single value.`);
}

function positive(value: ComplianceConfigValue | undefined) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function settingsFromDraft(draft: ComplianceRuleWrite): Record<string, unknown> {
  const source = draft.configuration || {};
  const settings: Record<string, unknown> = {};
  for (const key of [
    "start",
    "end",
    "weekend_start",
    "weekend_end",
    "saturday_start",
    "saturday_end",
    "sunday_start",
    "sunday_end",
  ]) {
    const value = String(source[key] || "").trim();
    if (value) settings[key] = value.slice(0, 5);
  }
  if (Array.isArray(source.days)) {
    settings.days = source.days.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6);
  }
  for (const key of ["interval_hours", "daily", "weekly", "monthly", "consent_expiry_days", "retention_days"]) {
    if (source[key] !== "" && source[key] != null) settings[key] = Number(source[key]);
  }
  if (typeof source.required_text === "string" && source.required_text.trim()) {
    settings.required_text = source.required_text.trim();
  }
  return settings;
}

export function overridePolicy(draft: ComplianceRuleWrite) {
  if (!draft.override_allowed) return "Not Permitted";
  if (
    draft.override_authorization_level === "Operations Admin With Reason" ||
    draft.override_authorization_level === "Client Configurable"
  ) {
    return draft.override_authorization_level;
  }
  return draft.override_reason_required ? "Operations Admin With Reason" : "Client Configurable";
}

export function toComplianceSaveBody(draft: ComplianceRuleWrite, reason?: string): ComplianceRuleSaveBody {
  const settings = settingsFromDraft(draft);
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    rule_type: draft.rule_type,
    category: draft.category,
    enforcement: draft.classification,
    regulatory_authority: draft.regulatory_authority.trim() || null,
    legal_reference: draft.legal_reference.trim() || null,
    country: draft.country,
    state: draft.states[0] || "",
    region: draft.regions[0] || "",
    city: draft.cities[0] || "",
    postal: (draft.postal_codes[0] || "").toUpperCase(),
    collector_type: draft.collector_types[0] || "",
    debt_type: draft.debt_types[0] || "",
    channel: draft.channels[0] || "All Channels",
    logic: draft.logic || "AND",
    conditions: (draft.conditions || [])
      .filter((item) => item.field)
      .map((item) => ({
        id: item.id,
        field: item.field,
        operator: item.operator || "Equals",
        value: item.value || "",
        period: Number(item.period) || 7,
      })),
    settings,
    action: draft.action,
    override_policy: overridePolicy(draft),
    effective_from: draft.effective_date || null,
    effective_until: draft.expiry_date || null,
    reason: reason?.trim() || undefined,
  };
}

export function complianceSaveIssues(
  draft: ComplianceRuleWrite,
  catalog: ComplianceCatalog,
  ruleTypes: ComplianceRuleTypeOption[],
  options: { strict: boolean; requireReason: boolean },
) {
  const issues: string[] = [];
  const type = ruleTypes.find((item) => item.code === draft.rule_type);
  if (!draft.name.trim()) issues.push("Rule name is required.");
  if (!draft.rule_type || !type) issues.push("Select a rule type.");
  if (!draft.category) issues.push("Rule category is required.");
  else if (catalog.categories.length && !catalog.categories.some((item) => item.name === draft.category)) {
    issues.push("Rule category is not one of the supported topics.");
  }
  if (!draft.classification) issues.push("Enforcement is required.");
  else if (catalog.classifications.length && !catalog.classifications.includes(draft.classification)) {
    issues.push("Enforcement must be Mandatory, Client Configurable, or Advisory.");
  }
  if (!draft.country) issues.push("Country is required.");
  else if (catalog.countries.length && !catalog.countries.includes(draft.country)) {
    issues.push("Country must be United States or Canada.");
  }
  if (!draft.action) issues.push("Enforcement action is required.");
  else if (catalog.actions.length && !catalog.actions.includes(draft.action)) {
    issues.push("Action is not one of the supported values.");
  }
  oneValue("State / province", draft.states, issues);
  oneValue("Region", draft.regions, issues);
  oneValue("City", draft.cities, issues);
  oneValue("Postal code", draft.postal_codes, issues);
  oneValue("Channel", draft.channels, issues);
  oneValue("Collector type", draft.collector_types, issues);
  oneValue("Debt type", draft.debt_types, issues);
  if (draft.channels[0] && catalog.channels.length && !catalog.channels.includes(draft.channels[0])) {
    issues.push("Channel is not one of the supported channels.");
  }
  if (draft.effective_date && draft.expiry_date && draft.expiry_date < draft.effective_date) {
    issues.push("Expiry date cannot be before the effective date.");
  }
  const start = String(draft.configuration.start || "");
  const end = String(draft.configuration.end || "");
  if (start && !TIME_RE.test(start)) issues.push("Start time must be HH:MM.");
  if (end && !TIME_RE.test(end)) issues.push("End time must be HH:MM.");
  if (start && end && start >= end) issues.push("Start time must be before the end time.");
  if (options.requireReason && !draft.change_reason.trim()) {
    issues.push("A reason for the change is required.");
  }

  const needs = type?.needs || [];
  const days = Array.isArray(draft.configuration.days) ? draft.configuration.days : [];
  const numericCondition = (draft.conditions || []).some(
    (item) => item.value.trim() !== "" && !Number.isNaN(Number(item.value)) && Number(item.period) > 0,
  );
  if (options.strict) {
    if (!draft.legal_reference.trim()) issues.push("Legal reference / source is required.");
    if (!draft.effective_date) issues.push("Effective date is required.");
    if (needs.includes("hours")) {
      if (!start || !end) issues.push("Permitted hours need a start time and an end time.");
      if (!days.length) issues.push("Select at least one permitted day.");
    }
    if (needs.includes("days") && !days.length) issues.push("Select at least one permitted day.");
    if (needs.includes("retention") && !positive(draft.configuration.retention_days)) {
      issues.push("Record retention needs a number of days.");
    }
    if (needs.includes("text") && !String(draft.configuration.required_text || "").trim()) {
      issues.push("Required text is required for this rule type.");
    }
    if (needs.includes("limit")) {
      const configured = ["daily", "weekly", "monthly", "interval_hours"].some((key) =>
        positive(draft.configuration[key]),
      );
      if (!configured && !numericCondition) {
        issues.push("A frequency rule needs a threshold and a rolling period.");
      }
    }
    if (needs.includes("period") && !(draft.conditions || []).some((item) => positive(item.value))) {
      issues.push("This rule type needs a period of at least one day.");
    }
    if (draft.classification === "Mandatory" && draft.action === "Allow") {
      issues.push("A Mandatory rule needs a restricting action. Allow is not a restriction.");
    }
    if (draft.classification === "Mandatory" && overridePolicy(draft) === "Client Configurable") {
      issues.push("A Mandatory rule cannot be overridden by the client.");
    }
    const hasLimit = ["daily", "weekly", "monthly", "interval_hours", "consent_expiry_days"].some((key) =>
      positive(draft.configuration[key]),
    );
    const hasText = Boolean(String(draft.configuration.required_text || "").trim());
    if (!(draft.conditions || []).some((item) => item.field) && !hasLimit && !hasText) {
      issues.push("Add at least one condition or limit. This rule can never apply.");
    }
  }
  return issues;
}
