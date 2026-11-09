import { apiRequest } from "./client";

export type PayflowEmailPreferencePublic = {
  account_reference: string;
  brand_name: string;
  email_masked?: string | null;
  subscribed: boolean;
  email_consent?: boolean | null;
};

/** Unauthenticated customer email preference APIs. */
export function resolveEmailPreference(token: string) {
  return apiRequest<PayflowEmailPreferencePublic>(
    `/payflow/public/email-preferences/${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export function unsubscribeEmailPreference(token: string) {
  return apiRequest<PayflowEmailPreferencePublic>(
    `/payflow/public/email-preferences/${encodeURIComponent(token)}/unsubscribe`,
    { method: "POST", auth: false },
  );
}

export function resubscribeEmailPreference(token: string) {
  return apiRequest<PayflowEmailPreferencePublic>(
    `/payflow/public/email-preferences/${encodeURIComponent(token)}/resubscribe`,
    { method: "POST", auth: false },
  );
}
