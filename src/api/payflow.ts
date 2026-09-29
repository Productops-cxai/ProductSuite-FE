import { apiRequest } from "./client";
import { cachedAsync, invalidateCache } from "../lib/dedupeAsync";
import type {
  MenusResponse,
  PayflowAccessContext,
  PayflowClient,
  PayflowPermissionGroup,
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

export function listPayflowRoles() {
  return apiRequest<{ roles: PayflowRoleListItem[] }>("/payflow/roles");
}

export function listPayflowClients() {
  return cachedAsync("payflow:clients", () =>
    apiRequest<{ clients: PayflowClient[] }>("/payflow/clients"),
  );
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
