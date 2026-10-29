import { apiRequest } from "./client";
import type {
  PayflowPaymentAttempt,
  PayflowPaymentPortalResolve,
} from "../types";

/** Unauthenticated customer payment portal APIs. */
export function resolvePaymentPortal(token: string, opts?: { preview?: boolean }) {
  const qs = opts?.preview ? "?preview=1" : "";
  return apiRequest<PayflowPaymentPortalResolve>(
    `/payflow/public/payment-links/${encodeURIComponent(token)}${qs}`,
    { auth: false },
  );
}

export type PayflowPlanQuote = {
  frequency: string;
  suggested_installment: number;
  installment_amount: number;
  installments_total: number;
  total_payable: number;
  currency_code: string;
  start_date: string;
  first_payment_date: string;
  final_payment_date: string;
  charge_today: boolean;
  first_charge_amount: number;
  setup_only: boolean;
  auto_charge_enabled: boolean;
  schedule: { sequence: number; amount: number; due_date: string; frequency?: string }[];
  option_id: string;
  label: string;
};

export function quotePaymentPlan(
  token: string,
  payload: {
    frequency: string;
    installment_amount?: number;
    start_date?: string;
  },
) {
  return apiRequest<PayflowPlanQuote>(
    `/payflow/public/payment-links/${encodeURIComponent(token)}/plan-quote`,
    { method: "POST", body: payload, auth: false },
  );
}

export function initiatePaymentPortal(
  token: string,
  payload: {
    option_id: string;
    amount?: number;
    idempotency_key?: string;
    frequency?: string;
    installment_amount?: number;
    start_date?: string;
  },
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
