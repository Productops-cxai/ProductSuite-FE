import { apiRequest } from "./client";
import type {
  ComplianceApplicableResponse,
  ComplianceAuditResponse,
  ComplianceCatalog,
  ComplianceRule,
  ComplianceRuleWrite,
  ComplianceRulesListResponse,
} from "../types";

export interface ComplianceListParams {
  search?: string;
  country?: string;
  state?: string;
  category?: string;
  channel?: string;
  classification?: string;
  status?: string;
  sort?: string;
  direction?: "asc" | "desc";
}

function query(params: object) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    q.set(key, String(value));
  }
  const text = q.toString();
  return text ? `?${text}` : "";
}

export function getComplianceCatalog() {
  return apiRequest<ComplianceCatalog>("/payflow/compliance-rules/catalog");
}

export function listComplianceRules(params: ComplianceListParams = {}) {
  return apiRequest<ComplianceRulesListResponse>(
    `/payflow/compliance-rules${query(params)}`,
  );
}

export function getComplianceRule(ruleId: number) {
  return apiRequest<ComplianceRule>(`/payflow/compliance-rules/${ruleId}`);
}

export function createComplianceRule(payload: ComplianceRuleWrite) {
  return apiRequest<ComplianceRule>("/payflow/compliance-rules", {
    method: "POST",
    body: payload,
  });
}

export function updateComplianceRule(ruleId: number, payload: ComplianceRuleWrite) {
  return apiRequest<ComplianceRule>(`/payflow/compliance-rules/${ruleId}/update`, {
    method: "POST",
    body: payload,
  });
}

export function duplicateComplianceRule(ruleId: number) {
  return apiRequest<ComplianceRule>(`/payflow/compliance-rules/${ruleId}/duplicate`, {
    method: "POST",
  });
}

export function submitComplianceRule(ruleId: number) {
  return apiRequest<ComplianceRule>(`/payflow/compliance-rules/${ruleId}/submit`, {
    method: "POST",
  });
}

export function approveComplianceRule(ruleId: number) {
  return apiRequest<ComplianceRule>(`/payflow/compliance-rules/${ruleId}/approve`, {
    method: "POST",
  });
}

export function rejectComplianceRule(ruleId: number, reason: string) {
  return apiRequest<ComplianceRule>(`/payflow/compliance-rules/${ruleId}/reject`, {
    method: "POST",
    body: { reason },
  });
}

export function activateComplianceRule(ruleId: number) {
  return apiRequest<ComplianceRule>(`/payflow/compliance-rules/${ruleId}/activate`, {
    method: "POST",
  });
}

export function deactivateComplianceRule(ruleId: number) {
  return apiRequest<ComplianceRule>(`/payflow/compliance-rules/${ruleId}/deactivate`, {
    method: "POST",
  });
}

export function scheduleComplianceRule(ruleId: number, activateOn: string) {
  return apiRequest<ComplianceRule>(`/payflow/compliance-rules/${ruleId}/schedule`, {
    method: "POST",
    body: { activate_on: activateOn },
  });
}

export function getComplianceAudit(ruleId: number) {
  return apiRequest<ComplianceAuditResponse>(`/payflow/compliance-rules/${ruleId}/audit`);
}

export function getApplicableComplianceRules(params: {
  clientId?: number | null;
  country?: string;
  state?: string;
  region?: string;
  city?: string;
  postal?: string;
}) {
  return apiRequest<ComplianceApplicableResponse>(
    `/payflow/compliance-rules/applicable${query({
      client_id: params.clientId ?? undefined,
      country: params.country,
      state: params.state,
      region: params.region,
      city: params.city,
      postal: params.postal,
    })}`,
  );
}

export function saveClientComplianceSelections(
  clientId: number,
  body: { selected_optional_ids: number[] | null; use_defaults: boolean },
) {
  return apiRequest<ComplianceApplicableResponse>(
    `/payflow/clients/${clientId}/compliance-selections`,
    { method: "POST", body },
  );
}

export function applyComplianceImportSelections(
  clients: { code: string; selected_optional_ids: number[] | null }[],
) {
  return apiRequest<{ applied: string[]; missing: string[] }>(
    "/payflow/compliance-rules/apply-import-selections",
    { method: "POST", body: { clients } },
  );
}
