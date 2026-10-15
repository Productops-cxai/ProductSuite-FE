import { apiRequest } from "./client";
import { cachedAsync, dedupeAsync, invalidateCache } from "../lib/dedupeAsync";
import { deletionSource } from "../lib/deletionSource";
import type {
  MenusResponse,
  Organization,
  OverviewResponse,
  Person,
  PersonSavePayload,
  Product,
  ProductAccessItem,
  ProductSavePayload,
  AiSuggestJob,
  EmailLog,
  SmsLog,
  DeletionLog,
  PayflowWorkflowWorkerLog,
} from "../types";

export function getOverview() {
  return cachedAsync("platform:overview", () => apiRequest<OverviewResponse>("/platform/overview"));
}

export function getMenus(context = "platform_admin") {
  return cachedAsync(`menus:${context}`, () =>
    apiRequest<MenusResponse>(`/menus?context=${encodeURIComponent(context)}`),
  );
}

export function listProducts() {
  return cachedAsync("catalog:products", () => apiRequest<Product[]>("/products"));
}

export function getProduct(id: number) {
  return apiRequest<Product>(`/products/${id}`);
}

export async function saveProduct(payload: ProductSavePayload) {
  const product = await apiRequest<Product>("/products", { method: "POST", body: payload });
  invalidateCache("catalog:products");
  invalidateCache("platform:overview");
  return product;
}

export async function deleteProduct(id: number) {
  const res = await apiRequest<{ message: string }>(`/products/${id}/delete${deletionSource()}`, {
    method: "POST",
  });
  invalidateCache("catalog:products");
  invalidateCache("platform:overview");
  invalidateCache("access:");
  return res;
}

export function listOrganizations() {
  return cachedAsync("catalog:organizations", () => apiRequest<Organization[]>("/organizations"));
}

export async function saveOrganization(payload: {
  id?: number;
  name: string;
  is_internal?: boolean;
}) {
  const org = await apiRequest<Organization>("/organizations", { method: "POST", body: payload });
  invalidateCache("catalog:organizations");
  invalidateCache("platform:overview");
  invalidateCache("access:");
  return org;
}

export function listProductAccess(params?: {
  search?: string;
  product_id?: number;
  access_status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.product_id) q.set("product_id", String(params.product_id));
  if (params?.access_status) q.set("access_status", params.access_status);
  const qs = q.toString();
  const key = `access:${qs || "all"}`;
  return cachedAsync(key, () =>
    apiRequest<ProductAccessItem[]>(`/product-access${qs ? `?${qs}` : ""}`),
  );
}

export async function grantAccess(organization_id: number, product_id: number) {
  const row = await apiRequest<ProductAccessItem>("/product-access/grant", {
    method: "POST",
    body: { organization_id, product_id },
  });
  invalidateCache("access:");
  invalidateCache("platform:overview");
  return row;
}

export async function revokeAccess(organization_id: number, product_id: number) {
  const row = await apiRequest<ProductAccessItem>("/product-access/revoke", {
    method: "POST",
    body: { organization_id, product_id },
  });
  invalidateCache("access:");
  invalidateCache("platform:overview");
  return row;
}

export function listPeople(params?: { search?: string; organization_id?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.organization_id) q.set("organization_id", String(params.organization_id));
  const qs = q.toString();
  const key = `people:${qs || "all"}`;
  return cachedAsync(key, () => apiRequest<Person[]>(`/people${qs ? `?${qs}` : ""}`), 10_000);
}

export async function savePerson(payload: PersonSavePayload) {
  const person = await apiRequest<Person>("/people", { method: "POST", body: payload });
  invalidateCache("people:");
  return person;
}

export async function deletePerson(userId: string) {
  const res = await apiRequest<{ message: string }>(`/people/${userId}/delete${deletionSource()}`, {
    method: "POST",
  });
  invalidateCache("people:");
  invalidateCache("me:products");
  return res;
}

export async function assignProduct(user_id: string, product_id: number) {
  const person = await apiRequest<Person>("/people/assign-product", {
    method: "POST",
    body: { user_id, product_id },
  });
  invalidateCache("people:");
  invalidateCache("me:products");
  return person;
}

export async function removeProduct(user_id: string, product_id: number) {
  const person = await apiRequest<Person>("/people/remove-product", {
    method: "POST",
    body: { user_id, product_id },
  });
  invalidateCache("people:");
  invalidateCache("me:products");
  return person;
}

export function resendInvite(user_id: string) {
  return apiRequest<{ message: string; activation_link?: string | null }>("/people/resend-invite", {
    method: "POST",
    body: { user_id },
  });
}

export function listEmailLogs(params?: {
  search?: string;
  email_type?: string;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.email_type) q.set("email_type", params.email_type);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<EmailLog[]>(`/email-logs${qs ? `?${qs}` : ""}`);
}

export function listSmsLogs(params?: {
  search?: string;
  sms_type?: string;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.sms_type) q.set("sms_type", params.sms_type);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<SmsLog[]>(`/sms-logs${qs ? `?${qs}` : ""}`);
}

export function listAiSuggestJobs(params?: {
  search?: string;
  status?: string;
  client_id?: number;
  portfolio_id?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.status) q.set("status", params.status);
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.portfolio_id != null) q.set("portfolio_id", String(params.portfolio_id));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<AiSuggestJob[]>(`/ai-suggest-jobs${qs ? `?${qs}` : ""}`);
}

export function listWorkflowWorkerLogs(params?: {
  search?: string;
  event_type?: string;
  level?: string;
  client_id?: number;
  account_id?: number;
  strategy_id?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.event_type) q.set("event_type", params.event_type);
  if (params?.level) q.set("level", params.level);
  if (params?.client_id != null) q.set("client_id", String(params.client_id));
  if (params?.account_id != null) q.set("account_id", String(params.account_id));
  if (params?.strategy_id != null) q.set("strategy_id", String(params.strategy_id));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<PayflowWorkflowWorkerLog[]>(
    `/workflow-worker-logs${qs ? `?${qs}` : ""}`,
  );
}

export function getWorkflowWorkerLog(logId: number) {
  return apiRequest<PayflowWorkflowWorkerLog>(`/workflow-worker-logs/${logId}`);
}

export function listDeletionLogs(params?: {
  search?: string;
  entity_type?: string;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.entity_type) q.set("entity_type", params.entity_type);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<DeletionLog[]>(`/deletion-logs${qs ? `?${qs}` : ""}`);
}

export function myProducts() {
  return cachedAsync("me:products", () => apiRequest<Product[]>("/me/products"), 15_000);
}

export function enterProduct(code: string) {
  return apiRequest<{ product: Product; message: string }>(`/products/${code}/enter`, {
    method: "POST",
  });
}

// Keep named export available for callers that only need in-flight merge.
export { dedupeAsync };
