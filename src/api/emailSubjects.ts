import { apiRequest } from "./client";
import type {
  EmailDraftResponse,
  EmailInsightRequest,
  EmailInsightResponse,
  EmailLowPerformersResponse,
  EmailMessageHistoryResponse,
  EmailProposal,
  EmailProposalsResponse,
  EmailSubjectDetails,
  EmailSubjectFilters,
  EmailSubjectSuggestionsResponse,
  EmailSubjectsResponse,
  EmailSubjectsTrendResponse,
  EmailWorkflowOptimizationResponse,
} from "../types/emailSubjects";

function appendFilters(q: URLSearchParams, filters: EmailSubjectFilters) {
  if (filters.date_range) q.set("date_range", filters.date_range);
  if (filters.date_range === "custom") {
    if (filters.date_from) q.set("date_from", filters.date_from);
    if (filters.date_to) q.set("date_to", filters.date_to);
  }
  if (filters.client_id != null) q.set("client_id", String(filters.client_id));
  for (const id of filters.portfolio_ids || []) q.append("portfolio_ids", String(id));
  if (filters.strategy_id != null) q.set("strategy_id", String(filters.strategy_id));
  if (filters.reminder_stage) q.set("reminder_stage", filters.reminder_stage);
  if (filters.purpose) q.set("purpose", filters.purpose);
  if (filters.search) q.set("search", filters.search);
}

export function listEmailSubjects(
  filters: EmailSubjectFilters,
  sort = "completed",
  order: "asc" | "desc" = "desc",
) {
  const q = new URLSearchParams();
  appendFilters(q, filters);
  if (sort) q.set("sort", sort);
  if (order) q.set("order", order);
  const qs = q.toString();
  return apiRequest<EmailSubjectsResponse>(
    `/payflow/dashboard/email-subjects${qs ? `?${qs}` : ""}`,
  );
}

export function getEmailSubjectDetails(
  filters: EmailSubjectFilters,
  subjectKey: string,
  period: "daily" | "weekly" = "daily",
) {
  const q = new URLSearchParams();
  appendFilters(q, { ...filters, search: undefined });
  q.set("subject_key", subjectKey);
  q.set("period", period);
  return apiRequest<EmailSubjectDetails>(`/payflow/dashboard/email-subjects/details?${q.toString()}`);
}

export function getEmailSubjectsTrend(
  filters: EmailSubjectFilters,
  groupBy: "overall" | "client" | "workflow" | "stage" = "overall",
  period: "daily" | "weekly" = "daily",
) {
  const q = new URLSearchParams();
  appendFilters(q, filters);
  q.set("group_by", groupBy);
  q.set("period", period);
  return apiRequest<EmailSubjectsTrendResponse>(
    `/payflow/dashboard/email-subjects/trend?${q.toString()}`,
  );
}

export function generateEmailSubjectInsight(payload: EmailInsightRequest) {
  return apiRequest<EmailInsightResponse>("/payflow/dashboard/email-subjects/insight", {
    method: "POST",
    body: payload,
  });
}

export function listEmailSubjectSuggestions(params: {
  client_id: number;
  strategy_id?: number;
  reminder_stage?: string;
  purpose?: string;
}) {
  const q = new URLSearchParams();
  q.set("client_id", String(params.client_id));
  if (params.strategy_id != null) q.set("strategy_id", String(params.strategy_id));
  if (params.reminder_stage) q.set("reminder_stage", params.reminder_stage);
  if (params.purpose) q.set("purpose", params.purpose);
  return apiRequest<EmailSubjectSuggestionsResponse>(
    `/payflow/email-subjects/suggestions?${q.toString()}`,
  );
}

export function draftWorkflowEmail(
  strategyId: number,
  payload: { step_id: string; remarks?: string },
) {
  return apiRequest<EmailDraftResponse>(`/payflow/workflows/${strategyId}/email-suggestion`, {
    method: "POST",
    body: payload,
  });
}

export function draftEmailForNewStep(payload: {
  client_id: number;
  purpose?: string;
  reminder_stage?: string;
  remarks?: string;
}) {
  return apiRequest<EmailDraftResponse>("/payflow/email-subjects/draft", {
    method: "POST",
    body: payload,
  });
}

export function getWorkflowMessageHistory(strategyId: number, stepId?: string) {
  const q = new URLSearchParams();
  if (stepId) q.set("step_id", stepId);
  const qs = q.toString();
  return apiRequest<EmailMessageHistoryResponse>(
    `/payflow/workflows/${strategyId}/message-history${qs ? `?${qs}` : ""}`,
  );
}

export function listLowPerformingEmails(params?: { client_id?: number; include_all?: boolean }) {
  const q = new URLSearchParams();
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.include_all) q.set("include_all", "true");
  const qs = q.toString();
  return apiRequest<EmailLowPerformersResponse>(
    `/payflow/email-subjects/low-performers${qs ? `?${qs}` : ""}`,
  );
}

export function scanLowPerformingEmails() {
  return apiRequest<{ workflows: number; proposals: number }>(
    "/payflow/email-subjects/low-performers/scan",
    { method: "POST", body: {} },
  );
}

export function analyzeWorkflowEmails(strategyId: number) {
  return apiRequest<EmailWorkflowOptimizationResponse>(
    `/payflow/workflows/${strategyId}/email-optimization`,
    { method: "POST", body: {} },
  );
}

export function listEmailProposals(params?: {
  strategy_id?: number;
  client_id?: number;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.strategy_id != null) q.set("strategy_id", String(params.strategy_id));
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiRequest<EmailProposalsResponse>(`/payflow/email-proposals${qs ? `?${qs}` : ""}`);
}

export function decideEmailProposal(
  proposalId: number,
  payload: { action: "accept" | "edit" | "reject"; subject?: string; body?: string; note?: string },
) {
  return apiRequest<EmailProposal>(`/payflow/email-proposals/${proposalId}/decide`, {
    method: "POST",
    body: payload,
  });
}
