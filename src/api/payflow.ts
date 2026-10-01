import { apiRequest, apiRequestBlob, apiRequestMultipart } from "./client";
import { cachedAsync, invalidateCache } from "../lib/dedupeAsync";
import type {
  MenusResponse,
  PayflowAccessContext,
  PayflowAccountsListResponse,
  PayflowAccount,
  PayflowBulkUploadResult,
  PayflowClient,
  PayflowClientDetail,
  PayflowClientsListResponse,
  PayflowIntegration,
  PayflowIntegrationsListResponse,
  PayflowMappingCatalogResponse,
  PayflowPermissionGroup,
  PayflowPortfolio,
  PayflowPortfoliosResponse,
  PayflowRoleListItem,
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
    email?: string;
    role_code?: string;
    confirm_role_change?: boolean;
  },
) {
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
  const res = await apiRequest<{ message: string }>(`/payflow/roles/${roleId}/delete`, {
    method: "POST",
  });
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
