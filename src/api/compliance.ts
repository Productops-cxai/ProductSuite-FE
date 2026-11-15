import { apiRequest } from "./client";
import type {
  ComplianceApiCatalog,
  ComplianceApiListResponse,
  ComplianceApiRule,
  ClientComplianceRulesResponse,
  ComplianceCatalog,
  ComplianceJurisdictionsResponse,
  ComplianceRuleHistory,
  ComplianceRuleSaveBody,
  ComplianceRuleTypeOption,
} from "../types";

export interface ComplianceListParams {
  search?: string;
  country?: string;
  state?: string;
  category?: string;
  rule_type?: string;
  channel?: string;
  enforcement?: string;
  status?: string;
  client_id?: number;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
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

/** Dropdown lists for the compliance rules screen (`GET /payflow/compliance/catalog`). */
export function getComplianceRuleCatalog() {
  return apiRequest<ComplianceApiCatalog>("/payflow/compliance/catalog");
}

/** Catalog shaped for the Add / Edit Compliance Rule form. */
export function loadComplianceEditorCatalog(): Promise<{
  catalog: ComplianceCatalog;
  ruleTypes: ComplianceRuleTypeOption[];
}> {
  return getComplianceRuleCatalog().then((raw) => {
    const topics = (raw.categories || []).map((name) => name.trim()).filter(Boolean);
    const ruleTypes = (raw.rule_types || []).filter((item) => item.code && item.name);
    const catalog: ComplianceCatalog = {
      categories: topics.map((name) => ({ name, fields: [] })),
      classifications: raw.enforcements || [],
      statuses: raw.statuses || [],
      channels: raw.channels || [],
      actions: raw.actions || [],
      collector_types: raw.collector_types || [],
      debt_types: raw.debt_types || [],
      countries: (raw.countries || []).map((item) => item.name).filter(Boolean),
      override_levels: raw.override_policies || [],
      weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    };
    return { catalog, ruleTypes };
  });
}

/** Countries, or states for one country (`GET /payflow/compliance/jurisdictions`). */
export function getComplianceJurisdictions(country?: string, state?: string) {
  return apiRequest<ComplianceJurisdictionsResponse>(
    `/payflow/compliance/jurisdictions${query({ country, state })}`,
  );
}

export function listComplianceRules(params: ComplianceListParams = {}) {
  return apiRequest<ComplianceApiListResponse>(`/payflow/compliance/rules${query(params)}`);
}

export function activateListedComplianceRule(ruleId: number, reason?: string) {
  return apiRequest<ComplianceApiRule>(`/payflow/compliance/rules/${ruleId}/activate`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export function deactivateListedComplianceRule(ruleId: number, reason: string) {
  return apiRequest<ComplianceApiRule>(`/payflow/compliance/rules/${ruleId}/deactivate`, {
    method: "POST",
    body: { reason },
  });
}

export function duplicateListedComplianceRule(ruleId: number) {
  return apiRequest<ComplianceApiRule>(`/payflow/compliance/rules/${ruleId}/duplicate`, {
    method: "POST",
  });
}

export function getComplianceRule(ruleId: number) {
  return apiRequest<ComplianceApiRule>(`/payflow/compliance/rules/${ruleId}`);
}

export function createComplianceRule(body: ComplianceRuleSaveBody) {
  return apiRequest<ComplianceApiRule>("/payflow/compliance/rules", {
    method: "POST",
    body,
  });
}

export function updateComplianceRule(ruleId: number, body: ComplianceRuleSaveBody) {
  return apiRequest<ComplianceApiRule>(`/payflow/compliance/rules/${ruleId}/update`, {
    method: "POST",
    body,
  });
}

export function duplicateComplianceRule(ruleId: number) {
  return duplicateListedComplianceRule(ruleId);
}

export function submitComplianceRule(ruleId: number, reason?: string) {
  return apiRequest<ComplianceApiRule>(`/payflow/compliance/rules/${ruleId}/submit`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export function approveComplianceRule(ruleId: number, reason?: string, activate = true) {
  return apiRequest<ComplianceApiRule>(`/payflow/compliance/rules/${ruleId}/approve`, {
    method: "POST",
    body: { reason, activate },
  });
}

export function rejectComplianceRule(ruleId: number, reason: string) {
  return apiRequest<ComplianceApiRule>(`/payflow/compliance/rules/${ruleId}/reject`, {
    method: "POST",
    body: { reason },
  });
}

export function activateComplianceRule(ruleId: number, reason?: string) {
  return activateListedComplianceRule(ruleId, reason);
}

export function deactivateComplianceRule(ruleId: number, reason: string) {
  return deactivateListedComplianceRule(ruleId, reason);
}

export function archiveComplianceRule(ruleId: number, reason?: string) {
  return apiRequest<ComplianceApiRule>(`/payflow/compliance/rules/${ruleId}/archive`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export function getComplianceRuleHistory(ruleId: number) {
  return apiRequest<ComplianceRuleHistory>(`/payflow/compliance/rules/${ruleId}/history`);
}

/** Rules in force for a saved client (`GET /payflow/clients/{id}/compliance-rules`). */
export function getClientComplianceRules(clientId: number) {
  return apiRequest<ClientComplianceRulesResponse>(`/payflow/clients/${clientId}/compliance-rules`);
}

/** Switch one non-mandatory rule on or off. Reason is required. */
export function updateClientComplianceRule(
  clientId: number,
  body: { rule_id: number; enabled: boolean; reason: string },
) {
  return apiRequest<ClientComplianceRulesResponse>(
    `/payflow/clients/${clientId}/compliance-rules/update`,
    { method: "POST", body },
  );
}

/** Re-link the client to the rules of its current jurisdiction. */
export function syncClientComplianceRules(clientId: number) {
  return apiRequest<ClientComplianceRulesResponse>(
    `/payflow/clients/${clientId}/compliance-rules/sync`,
    { method: "POST", body: {} },
  );
}

/**
 * Active rules for a place, used only before a client id exists.
 * The client endpoint does the real jurisdiction match after the client is saved.
 */
export async function previewActiveComplianceRules(country: string, state?: string) {
  const scoped = await listComplianceRules({
    country,
    state: state || undefined,
    status: "Active",
    limit: 200,
  });
  if (!state) return scoped.rules;
  const countryWide = await listComplianceRules({ country, status: "Active", limit: 200 });
  const seen = new Set(scoped.rules.map((rule) => rule.id));
  const broader = countryWide.rules.filter((rule) => !rule.state && !seen.has(rule.id));
  return [...scoped.rules, ...broader];
}
