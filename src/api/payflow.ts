import { apiRequest, apiRequestBlob, apiRequestMultipart } from "./client";
import { cachedAsync, invalidateCache } from "../lib/dedupeAsync";
import { deletionSource } from "../lib/deletionSource";
import type {
  MenusResponse,
  DeletionLog,
  PayflowAccessContext,
  PayflowAccountsListResponse,
  PayflowAccount,
  PayflowBulkUploadResult,
  PayflowImportPreviewResponse,
  PayflowImportListResponse,
  PayflowImportRun,
  PayflowClient,
  PayflowClientDetail,
  PayflowClientsListResponse,
  PayflowCommunication,
  PayflowCommunicationsListResponse,
  PayflowDashboardResponse,
  PayflowIntegration,
  PayflowIntegrationsListResponse,
  PayflowMappingCatalogResponse,
  PayflowNotification,
  PayflowNotificationsListResponse,
  PayflowPermissionGroup,
  PayflowPortfolio,
  PayflowPortfolioDetail,
  PayflowPortfoliosResponse,
  PayflowReview,
  PayflowReviewsListResponse,
  PayflowRoleListItem,
  PayflowRule,
  PayflowRulesListResponse,
  PayflowStrategiesListResponse,
  PayflowStrategy,
  PayflowUser,
  PayflowUsersListResponse,
} from "../types";

export function getPayflowAccessContext() {
  return cachedAsync("payflow:access-context", () =>
    apiRequest<PayflowAccessContext>("/payflow/access-context"),
  );
}

export function getPayflowMenus() {
  return cachedAsync("payflow:menus", () => apiRequest<MenusResponse>("/payflow/menus"));
}

export function listPayflowUsers(params?: {
  search?: string;
  role_code?: string;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.role_code) q.set("role_code", params.role_code);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiRequest<PayflowUsersListResponse>(`/payflow/users${qs ? `?${qs}` : ""}`);
}

export function getPayflowUser(userId: string) {
  return apiRequest<PayflowUser>(`/payflow/users/${userId}`);
}

export async function createPayflowUser(payload: {
  full_name: string;
  email: string;
  role_code: string;
  status?: string;
  client_ids?: number[];
  permission_codes?: string[];
}) {
  const user = await apiRequest<PayflowUser>("/payflow/users", {
    method: "POST",
    body: payload,
  });
  invalidateCache("payflow:");
  return user;
}

export async function updatePayflowUser(
  userId: string,
  payload: {
    full_name?: string;
    role_code?: string;
    confirm_role_change?: boolean;
  },
) {
  // Email is immutable after create — never send it on update.
  const user = await apiRequest<PayflowUser>(`/payflow/users/${userId}/update`, {
    method: "POST",
    body: payload,
  });
  invalidateCache("payflow:");
  return user;
}

export async function resendPayflowInvitation(userId: string) {
  return apiRequest<{ message: string; activation_link?: string | null }>(
    `/payflow/users/${userId}/resend-invitation`,
    { method: "POST" },
  );
}

export async function deactivatePayflowUser(userId: string) {
  const user = await apiRequest<PayflowUser>(`/payflow/users/${userId}/deactivate`, {
    method: "POST",
  });
  invalidateCache("payflow:");
  return user;
}

export async function reactivatePayflowUser(userId: string) {
  const user = await apiRequest<PayflowUser>(`/payflow/users/${userId}/reactivate`, {
    method: "POST",
  });
  invalidateCache("payflow:");
  return user;
}

export async function deletePayflowUser(userId: string) {
  const res = await apiRequest<{ message: string }>(
    `/payflow/users/${userId}/delete${deletionSource()}`,
    { method: "POST" },
  );
  invalidateCache("payflow:");
  return res;
}

export function listPayflowRoles() {
  return apiRequest<{ roles: PayflowRoleListItem[] }>("/payflow/roles");
}

/**
 * List PayFlow clients. Called with no args (e.g. from the client-assignment
 * picker) this stays cached exactly as before. Called with filter params
 * (Clients list page) it always hits the API so filtering stays live.
 */
export function listPayflowClients(params?: {
  search?: string;
  status?: string;
  client_type?: string;
  business_domain?: string;
  ai_mode?: string;
  supervisor_user_id?: string;
}) {
  if (!params || Object.values(params).every((v) => !v)) {
    return cachedAsync("payflow:clients", () =>
      apiRequest<PayflowClientsListResponse>("/payflow/clients"),
    );
  }
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.client_type) q.set("client_type", params.client_type);
  if (params.business_domain) q.set("business_domain", params.business_domain);
  if (params.ai_mode) q.set("ai_mode", params.ai_mode);
  if (params.supervisor_user_id) q.set("supervisor_user_id", params.supervisor_user_id);
  const qs = q.toString();
  return apiRequest<PayflowClientsListResponse>(`/payflow/clients${qs ? `?${qs}` : ""}`);
}

export function getPayflowClient(clientId: number) {
  return apiRequest<PayflowClientDetail>(`/payflow/clients/${clientId}`);
}

export async function createPayflowClient(payload: {
  name: string;
  code: string;
  client_type?: string;
  business_domain?: string;
  industry?: string;
  ai_mode?: string;
}) {
  const client = await apiRequest<PayflowClientDetail>("/payflow/clients", {
    method: "POST",
    body: payload,
  });
  invalidateCache("payflow:");
  return client;
}

export interface UpdatePayflowClientPayload {
  name?: string;
  code?: string;
  client_type?: string;
  business_domain?: string;
  industry?: string;
  category?: string;
  ai_mode?: string;
  data_source_type?: string | null;
  connection_status?: string;
  crm_system_name?: string;
  integration_ref?: string;
  environment?: string;
  sync_frequency?: string;
  brand_name?: string;
  sender_name?: string;
  email_from?: string;
  sms_sender_id?: string;
  channels?: { email?: boolean; sms?: boolean; whatsapp?: boolean };
  governance_rules?: string[];
  mappings?: {
    source_field: string;
    payflow_field?: string | null;
    sample_value?: string | null;
    status?: string;
  }[];
  supervisor_user_ids?: string[];
}

export async function updatePayflowClient(
  clientId: number,
  payload: UpdatePayflowClientPayload,
) {
  const client = await apiRequest<PayflowClientDetail>(`/payflow/clients/${clientId}/update`, {
    method: "POST",
    body: payload,
  });
  invalidateCache("payflow:");
  return client;
}

export async function deletePayflowClient(clientId: number) {
  const res = await apiRequest<{ message: string }>(
    `/payflow/clients/${clientId}/delete${deletionSource()}`,
    { method: "POST" },
  );
  invalidateCache("payflow:");
  return res;
}

export async function uploadPayflowClientLogo(clientId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  const client = await apiRequestMultipart<PayflowClientDetail>(
    `/payflow/clients/${clientId}/logo`,
    form,
  );
  invalidateCache("payflow:");
  return client;
}

export async function removePayflowClientLogo(clientId: number) {
  const client = await apiRequest<PayflowClientDetail>(
    `/payflow/clients/${clientId}/logo/delete`,
    { method: "POST" },
  );
  invalidateCache("payflow:");
  return client;
}

export async function activatePayflowClient(clientId: number) {
  const client = await apiRequest<PayflowClientDetail>(`/payflow/clients/${clientId}/activate`, {
    method: "POST",
  });
  invalidateCache("payflow:");
  return client;
}

export function listPayflowClientPortfolios(clientId: number) {
  return apiRequest<PayflowPortfoliosResponse>(`/payflow/clients/${clientId}/portfolios`);
}

export function getPayflowClientPortfolio(clientId: number, portfolioId: number) {
  return apiRequest<PayflowPortfolioDetail>(
    `/payflow/clients/${clientId}/portfolios/${portfolioId}`,
  );
}

export async function createPayflowClientPortfolio(
  clientId: number,
  payload: { name: string; code: string; status?: string; description?: string },
) {
  const portfolio = await apiRequest<PayflowPortfolio>(
    `/payflow/clients/${clientId}/portfolios`,
    { method: "POST", body: payload },
  );
  invalidateCache("payflow:");
  return portfolio;
}

export async function updatePayflowClientPortfolio(
  clientId: number,
  portfolioId: number,
  payload: { name?: string; code?: string; status?: string; description?: string },
) {
  const portfolio = await apiRequest<PayflowPortfolio>(
    `/payflow/clients/${clientId}/portfolios/${portfolioId}/update`,
    { method: "POST", body: payload },
  );
  invalidateCache("payflow:");
  return portfolio;
}

export async function deletePayflowClientPortfolio(clientId: number, portfolioId: number) {
  const res = await apiRequest<{ message: string }>(
    `/payflow/clients/${clientId}/portfolios/${portfolioId}/delete${deletionSource()}`,
    { method: "POST" },
  );
  invalidateCache("payflow:");
  return res;
}

export function getPayflowClientMappingCatalog() {
  return cachedAsync("payflow:clients:mapping-catalog", () =>
    apiRequest<PayflowMappingCatalogResponse>("/payflow/clients/mapping-catalog"),
  );
}

export async function downloadPayflowClientsBulkTemplate() {
  const blob = await apiRequestBlob("/payflow/clients/bulk-template");
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "payflow_clients_bulk_template.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function validatePayflowClientsBulk(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequestMultipart<PayflowImportPreviewResponse>(
    "/payflow/clients/bulk-validate",
    formData,
  );
}

export async function uploadPayflowClientsBulk(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const result = await apiRequestMultipart<PayflowBulkUploadResult>(
    "/payflow/clients/bulk-upload",
    formData,
  );
  invalidateCache("payflow:");
  return result;
}

export function listPayflowPermissions() {
  return cachedAsync("payflow:permissions", () =>
    apiRequest<{ groups: PayflowPermissionGroup[] }>("/payflow/permissions"),
  );
}

export async function createPayflowRole(payload: {
  name: string;
  scope: string;
  description?: string;
  permission_codes: string[];
}) {
  const res = await apiRequest<{ roles: PayflowRoleListItem[] }>("/payflow/roles", {
    method: "POST",
    body: payload,
  });
  invalidateCache("payflow:");
  return res;
}

export async function updatePayflowRole(
  roleId: number,
  payload: {
    name?: string;
    description?: string;
    permission_codes?: string[];
  },
) {
  const res = await apiRequest<{ roles: PayflowRoleListItem[] }>(
    `/payflow/roles/${roleId}/update`,
    { method: "POST", body: payload },
  );
  invalidateCache("payflow:");
  return res;
}

export async function deletePayflowRole(roleId: number) {
  const res = await apiRequest<{ message: string }>(
    `/payflow/roles/${roleId}/delete${deletionSource()}`,
    { method: "POST" },
  );
  invalidateCache("payflow:");
  return res;
}

export function listPayflowAccounts(params?: {
  client_id?: number;
  portfolio_id?: number;
  status?: string;
  workflow?: string;
  human_review?: string;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.portfolio_id != null) q.set("portfolio_id", String(params.portfolio_id));
  if (params?.status) q.set("status", params.status);
  if (params?.workflow) q.set("workflow", params.workflow);
  if (params?.human_review) q.set("human_review", params.human_review);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  return apiRequest<PayflowAccountsListResponse>(`/payflow/accounts${qs ? `?${qs}` : ""}`);
}

export function getPayflowAccount(accountId: number) {
  return apiRequest<PayflowAccount>(`/payflow/accounts/${accountId}`);
}

export async function downloadPayflowAccountImportTemplate() {
  const blob = await apiRequestBlob("/payflow/imports/accounts/template");
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "payflow_daily_accounts_sample.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function validatePayflowAccountImport(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequestMultipart<PayflowImportPreviewResponse>(
    "/payflow/imports/accounts/validate",
    formData,
  );
}

export async function uploadPayflowAccountImport(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const result = await apiRequestMultipart<PayflowImportRun>(
    "/payflow/imports/accounts/upload",
    formData,
  );
  invalidateCache("payflow:");
  return result;
}

export function listPayflowImports(params?: { type?: string }) {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  const qs = q.toString();
  return apiRequest<PayflowImportListResponse>(`/payflow/imports${qs ? `?${qs}` : ""}`);
}

export function getPayflowImport(importId: string | number) {
  return apiRequest<PayflowImportRun>(`/payflow/imports/${importId}`);
}

export function listPayflowIntegrations(params?: {
  status?: string;
  client_id?: number;
  category?: string;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.category) q.set("category", params.category);
  const qs = q.toString();
  return apiRequest<PayflowIntegrationsListResponse>(
    `/payflow/integrations${qs ? `?${qs}` : ""}`,
  );
}

export function getPayflowIntegration(integrationId: string) {
  return apiRequest<PayflowIntegration>(
    `/payflow/integrations/${encodeURIComponent(integrationId)}`,
  );
}

export async function testPayflowIntegration(integrationId: string) {
  return apiRequest<{ message: string; integration_id: string; status: string }>(
    `/payflow/integrations/${encodeURIComponent(integrationId)}/test`,
    { method: "POST" },
  );
}

export function listPayflowReviews(params?: {
  client_id?: number;
  status?: string;
  priority?: string;
  reason?: string;
  search?: string;
  waiting_bucket?: string;
}) {
  const q = new URLSearchParams();
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.status) q.set("status", params.status);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.reason) q.set("reason", params.reason);
  if (params?.search) q.set("search", params.search);
  if (params?.waiting_bucket) q.set("waiting_bucket", params.waiting_bucket);
  const qs = q.toString();
  return apiRequest<PayflowReviewsListResponse>(`/payflow/reviews${qs ? `?${qs}` : ""}`);
}

export function getPayflowReview(reviewId: number) {
  return apiRequest<PayflowReview>(`/payflow/reviews/${reviewId}`);
}

export async function approvePayflowReview(reviewId: number, payload?: { note?: string }) {
  return apiRequest<PayflowReview>(`/payflow/reviews/${reviewId}/approve`, {
    method: "POST",
    body: payload || {},
  });
}

export async function modifyPayflowReview(
  reviewId: number,
  payload: { action: string; guidance?: string },
) {
  return apiRequest<PayflowReview>(`/payflow/reviews/${reviewId}/modify`, {
    method: "POST",
    body: payload,
  });
}

export async function rejectPayflowReview(
  reviewId: number,
  payload: { reason: string; comment?: string },
) {
  return apiRequest<PayflowReview>(`/payflow/reviews/${reviewId}/reject`, {
    method: "POST",
    body: payload,
  });
}

export async function holdPayflowReview(
  reviewId: number,
  payload?: { until?: string; reason?: string },
) {
  return apiRequest<PayflowReview>(`/payflow/reviews/${reviewId}/hold`, {
    method: "POST",
    body: payload || {},
  });
}

export function listPayflowRules(params?: {
  client_id?: number;
  status?: string;
  category?: string;
  action?: string;
  rule_type?: string;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.status) q.set("status", params.status);
  if (params?.category) q.set("category", params.category);
  if (params?.action) q.set("action", params.action);
  if (params?.rule_type) q.set("rule_type", params.rule_type);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  return apiRequest<PayflowRulesListResponse>(`/payflow/rules${qs ? `?${qs}` : ""}`);
}

export function getPayflowRule(ruleId: number) {
  return apiRequest<PayflowRule>(`/payflow/rules/${ruleId}`);
}

export async function createPayflowRule(payload: {
  name: string;
  description?: string;
  rule_type?: string;
  client_id?: number | null;
  category: string;
  logic?: string;
  conditions: { id?: string; field: string; operator: string; value: string }[];
  action: string;
  status?: string;
}) {
  return apiRequest<PayflowRule>("/payflow/rules", { method: "POST", body: payload });
}

export async function activatePayflowRule(ruleId: number) {
  return apiRequest<PayflowRule>(`/payflow/rules/${ruleId}/activate`, { method: "POST" });
}

export async function deactivatePayflowRule(ruleId: number) {
  return apiRequest<PayflowRule>(`/payflow/rules/${ruleId}/deactivate`, { method: "POST" });
}

export async function deletePayflowRule(ruleId: number) {
  const res = await apiRequest<{ message: string }>(
    `/payflow/rules/${ruleId}/delete${deletionSource()}`,
    { method: "POST" },
  );
  invalidateCache("payflow:");
  return res;
}

export function listPayflowWorkflows(params?: {
  client_id?: number;
  portfolio_id?: number;
  status?: string;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.portfolio_id != null) q.set("portfolio_id", String(params.portfolio_id));
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  return apiRequest<PayflowStrategiesListResponse>(`/payflow/workflows${qs ? `?${qs}` : ""}`);
}

export function getPayflowWorkflow(strategyId: number) {
  return apiRequest<PayflowStrategy>(`/payflow/workflows/${strategyId}`);
}

export type PayflowWorkflowStepPayload = {
  id?: string;
  kind: string;
  title: string;
  origin?: string;
  disabled?: boolean;
  config?: {
    channel?: string | null;
    purpose?: string | null;
    reference_event?: string | null;
    amount?: number | null;
    unit?: string | null;
    direction?: string | null;
    attribute?: string | null;
    operator?: string | null;
    value?: string | null;
    action?: string | null;
    outcome?: string | null;
    note?: string | null;
    template_id?: string | null;
  };
  next?: string | null;
  yes?: string | null;
  no?: string | null;
  channel?: string | null;
  purpose?: string | null;
  timing?: string | null;
  detail?: string | null;
};

export async function createPayflowWorkflow(payload: {
  name: string;
  client_id: number;
  portfolio_id: number;
  summary?: string;
  coverage?: string;
  cases_covered?: number;
  segment?: Record<string, string>;
  steps: PayflowWorkflowStepPayload[];
  entry_node_id?: string;
  status?: string;
  source?: string;
  ai_context?: { label: string; value: string }[];
}) {
  return apiRequest<PayflowStrategy>("/payflow/workflows", { method: "POST", body: payload });
}

export async function updatePayflowWorkflow(
  strategyId: number,
  payload: {
    name?: string;
    summary?: string;
    coverage?: string;
    cases_covered?: number;
    segment?: Record<string, string>;
    steps?: PayflowWorkflowStepPayload[];
    entry_node_id?: string;
  },
) {
  return apiRequest<PayflowStrategy>(`/payflow/workflows/${strategyId}/update`, {
    method: "POST",
    body: payload,
  });
}

export async function savePayflowWorkflowDraft(strategyId: number) {
  return apiRequest<PayflowStrategy>(`/payflow/workflows/${strategyId}/save-draft`, {
    method: "POST",
  });
}

export async function beginPayflowWorkflowReview(strategyId: number) {
  return apiRequest<PayflowStrategy>(`/payflow/workflows/${strategyId}/begin-review`, {
    method: "POST",
  });
}

export async function submitPayflowWorkflowReview(strategyId: number) {
  return apiRequest<PayflowStrategy>(`/payflow/workflows/${strategyId}/submit-review`, {
    method: "POST",
  });
}

export async function approvePayflowWorkflow(strategyId: number) {
  return apiRequest<PayflowStrategy>(`/payflow/workflows/${strategyId}/approve`, {
    method: "POST",
  });
}

export async function rejectPayflowWorkflow(strategyId: number, payload?: { note?: string }) {
  return apiRequest<PayflowStrategy>(`/payflow/workflows/${strategyId}/reject`, {
    method: "POST",
    body: payload || {},
  });
}

export async function activatePayflowWorkflow(strategyId: number) {
  return apiRequest<PayflowStrategy>(`/payflow/workflows/${strategyId}/activate`, {
    method: "POST",
  });
}

export async function deactivatePayflowWorkflow(strategyId: number) {
  return apiRequest<PayflowStrategy>(`/payflow/workflows/${strategyId}/deactivate`, {
    method: "POST",
  });
}

export async function deletePayflowWorkflow(strategyId: number) {
  const res = await apiRequest<{ message: string }>(
    `/payflow/workflows/${strategyId}/delete${deletionSource()}`,
    { method: "POST" },
  );
  invalidateCache("payflow:");
  return res;
}

export function listPayflowComms(params?: {
  client_id?: number;
  account_id?: number;
  status?: string;
  channel?: string;
  purpose?: string;
  workflow?: string;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.account_id != null) q.set("account_id", String(params.account_id));
  if (params?.status) q.set("status", params.status);
  if (params?.channel) q.set("channel", params.channel);
  if (params?.purpose) q.set("purpose", params.purpose);
  if (params?.workflow) q.set("workflow", params.workflow);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  return apiRequest<PayflowCommunicationsListResponse>(`/payflow/comms${qs ? `?${qs}` : ""}`);
}

export function getPayflowDashboard(params?: {
  date_range?: string;
  client_id?: number;
  channel?: string;
  workflow?: string;
}) {
  const q = new URLSearchParams();
  if (params?.date_range) q.set("date_range", params.date_range);
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.channel) q.set("channel", params.channel);
  if (params?.workflow) q.set("workflow", params.workflow);
  const qs = q.toString();
  return apiRequest<PayflowDashboardResponse>(`/payflow/dashboard${qs ? `?${qs}` : ""}`);
}

export function getPayflowComm(communicationId: number) {
  return apiRequest<PayflowCommunication>(`/payflow/comms/${communicationId}`);
}

export function listPayflowNotifications() {
  return apiRequest<PayflowNotificationsListResponse>("/payflow/notifications");
}

export async function markPayflowNotificationRead(notificationId: number) {
  return apiRequest<PayflowNotification>(`/payflow/notifications/${notificationId}/read`, {
    method: "POST",
  });
}

export async function markAllPayflowNotificationsRead() {
  return apiRequest<PayflowNotificationsListResponse>("/payflow/notifications/read-all", {
    method: "POST",
  });
}

export function listPayflowDeletionLogs(params?: {
  search?: string;
  entity_type?: string;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.entity_type) q.set("entity_type", params.entity_type);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<DeletionLog[]>(`/payflow/deletion-logs${qs ? `?${qs}` : ""}`);
}
