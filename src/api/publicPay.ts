import { apiRequest } from "./client";
import type {
  PayflowPaymentAttempt,
  PayflowPaymentPortalResolve,
} from "../types";

/** Unauthenticated customer payment portal APIs. */
export function resolvePaymentPortal(token: string) {
  return apiRequest<PayflowPaymentPortalResolve>(
    `/payflow/public/payment-links/${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export function initiatePaymentPortal(
  token: string,
  payload: { option_id: string; amount?: number; idempotency_key?: string },
) {
  return apiRequest<PayflowPaymentAttempt>(
    `/payflow/public/payment-links/${encodeURIComponent(token)}/initiate`,
    { method: "POST", body: payload, auth: false },
  );
}

export function getPaymentAttempt(token: string, attemptId: string) {
  return apiRequest<PayflowPaymentAttempt>(
    `/payflow/public/payment-links/${encodeURIComponent(token)}/attempts/${encodeURIComponent(attemptId)}`,
    { auth: false },
  );
}

export function cancelPaymentAttempt(token: string, attemptId: string) {
  return apiRequest<PayflowPaymentAttempt>(
    `/payflow/public/payment-links/${encodeURIComponent(token)}/attempts/${encodeURIComponent(attemptId)}/cancel`,
    { method: "POST", body: {}, auth: false },
  );
}

export function mockPaymentOutcome(
  token: string,
  attemptId: string,
  outcome: "success" | "failed" | "cancel",
) {
  return apiRequest<PayflowPaymentAttempt>(
    `/payflow/public/payment-links/${encodeURIComponent(token)}/attempts/${encodeURIComponent(attemptId)}/mock-outcome`,
    { method: "POST", body: { outcome }, auth: false },
  );
}
