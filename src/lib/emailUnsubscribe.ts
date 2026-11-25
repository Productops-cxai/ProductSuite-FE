import type { EmailUnsubscribeReasonOption } from "../types";

/**
 * Fixed catalog from the email-unsubscribe API.
 * Used when a staff dialog cannot read `reason_options` (the live list is preferred).
 * Review-required codes match `review_reason_codes`.
 */
export const EMAIL_UNSUBSCRIBE_REASON_OPTIONS: EmailUnsubscribeReasonOption[] = [
  { code: "too_many", label: "Too many emails / contacting too often" },
  { code: "prefer_other_channel", label: "Prefer a different channel (SMS, phone or mail)" },
  { code: "already_paid", label: "Already paid or arranged a plan" },
  { code: "wrong_person", label: "Not the right person / wrong contact" },
  { code: "dispute", label: "Dispute this debt / don't believe I owe this" },
  { code: "attorney", label: "Working with an attorney or agency" },
  { code: "not_helpful", label: "Content not helpful or relevant" },
  { code: "prefer_no_email", label: "Prefer not to receive collection emails" },
  { code: "other", label: "Other" },
];

export const EMAIL_UNSUBSCRIBE_REVIEW_CODES = [
  "already_paid",
  "wrong_person",
  "dispute",
  "attorney",
] as const;

export function unsubscribeSourceLabel(source?: string | null): string {
  switch (source) {
    case "preference_page":
      return "Preference page";
    case "one_click":
      return "One-click";
    case "staff":
      return "Staff";
    default:
      if (!source) return "—";
      return source.replace(/_/g, " ");
  }
}

export function toggleUnsubscribeReason(selected: string[], code: string): string[] {
  return selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code];
}

export function formatUnsubscribeStamp(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatUnsubscribeBalance(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

type UnsubscribeRuleIdentity = {
  name?: string | null;
  code?: string | null;
  category?: string | null;
  action?: string | null;
};

function norm(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

/** Governance / compliance identity for Unsubscribe Option (formerly Consent & Opt-Out). */
export function isUnsubscribeOptionIdentity(rule: UnsubscribeRuleIdentity): boolean {
  const name = norm(rule.name);
  const code = norm(rule.code);
  const category = norm(rule.category);
  const action = norm(rule.action);
  if (code === "allow-unsubscribe-option" || code.includes("allow-unsubscribe")) return true;
  if (action === "include unsubscribe option" || action.includes("unsubscribe option")) return true;
  if (
    category === "unsubscribe option" ||
    category === "consent & opt-out" ||
    category === "consent and opt-out"
  ) {
    return true;
  }
  if (
    name === "allow unsubscribe option" ||
    name === "unsubscribe option" ||
    name === "consent & opt-out" ||
    name === "consent and opt-out" ||
    name.includes("unsubscribe option") ||
    name.includes("allow unsubscribe") ||
    name.includes("consent & opt-out") ||
    name.includes("consent and opt-out")
  ) {
    return true;
  }
  return false;
}

/** Client governance selection (`governance_rules` names) includes Unsubscribe Option. */
export function governanceSelectionIncludesUnsubscribe(names?: string[] | null): boolean {
  return (names || []).some((name) =>
    isUnsubscribeOptionIdentity({ name, code: name, category: name, action: name }),
  );
}

type ClientUnsubscribeComplianceRule = UnsubscribeRuleIdentity & {
  enabled?: boolean;
  in_force?: boolean;
  enforcement?: string | null;
  status?: string | null;
  locked?: boolean;
};

/**
 * True when this client has Unsubscribe Option turned on,
 * or a mandatory compliance rule in that category is in force.
 */
export function complianceRulesIncludeUnsubscribe(
  rules?: ClientUnsubscribeComplianceRule[] | null,
): boolean {
  return (rules || []).some((rule) => {
    if (!isUnsubscribeOptionIdentity(rule)) return false;
    const status = norm(rule.status);
    if (["draft", "inactive", "archived", "rejected", "retired"].includes(status)) return false;
    const mandatory = norm(rule.enforcement) === "mandatory" || Boolean(rule.locked);
    if (mandatory) return rule.in_force !== false;
    return Boolean(rule.enabled || rule.in_force);
  });
}
