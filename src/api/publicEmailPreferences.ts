import type { EmailUnsubscribeEvent, EmailUnsubscribeReasonOption } from "../types";
import { apiRequest } from "./client";

export type PayflowEmailPreferencePublic = {
  account_reference: string;
  brand_name: string;
  email_masked?: string | null;
  subscribed: boolean;
  email_consent?: boolean | null;
  unsubscribe_option_enabled?: boolean;
  /** Legacy flag. The preference page always collects one reason and sends it on unsubscribe. */
  collect_reasons?: boolean;
  reason_options?: EmailUnsubscribeReasonOption[];
  last_unsubscribe?: EmailUnsubscribeEvent | null;
};

export type EmailPreferenceUnsubscribeBody = {
  reasons?: string[];
  comment?: string;
  source?: "preference_page";
};

/** Unauthenticated customer email preference APIs. */
export function resolveEmailPreference(token: string) {
  return apiRequest<PayflowEmailPreferencePublic>(
    `/payflow/public/email-preferences/${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export function unsubscribeEmailPreference(
  token: string,
  body: EmailPreferenceUnsubscribeBody = { source: "preference_page" },
) {
  return apiRequest<PayflowEmailPreferencePublic>(
    `/payflow/public/email-preferences/${encodeURIComponent(token)}/unsubscribe`,
    { method: "POST", auth: false, body },
  );
}

export function resubscribeEmailPreference(token: string) {
  return apiRequest<PayflowEmailPreferencePublic>(
    `/payflow/public/email-preferences/${encodeURIComponent(token)}/resubscribe`,
    { method: "POST", auth: false },
  );
}
