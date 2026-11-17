import type { EmailUnsubscribeReasonOption } from "../types";

/**
 * Fixed catalog from the email-unsubscribe API.
 * Used when a staff dialog cannot read `reason_options` (the live list is preferred).
 * Review-required codes match `review_reason_codes`.
 */
export const EMAIL_UNSUBSCRIBE_REASON_OPTIONS: EmailUnsubscribeReasonOption[] = [
  { code: "too_many", label: "Too many emails / contacting too often" },
  { code: "prefer_other_channel", label: "Prefer a different channel (SMS, phone, or mail)" },
  { code: "already_paid", label: "Already paid or arranged a payment plan" },
  { code: "wrong_person", label: "Not the right person / wrong contact details" },
  { code: "dispute", label: "Dispute this debt / do not believe I owe this" },
  { code: "attorney", label: "Working with an attorney or another agency" },
  { code: "not_helpful", label: "Emails are not helpful or not relevant" },
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
