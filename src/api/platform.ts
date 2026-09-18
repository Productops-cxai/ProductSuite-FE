import { apiRequest } from "./client";
import type {
  MenusResponse,
  Organization,
  OverviewResponse,
  Person,
  PersonSavePayload,
  Product,
  ProductAccessItem,
  ProductSavePayload,
  EmailLog,
} from "../types";

export function getOverview() {
  return apiRequest<OverviewResponse>("/platform/overview");
}

export function getMenus(context = "platform_admin") {
  return apiRequest<MenusResponse>(`/menus?context=${encodeURIComponent(context)}`);
}

export function listProducts() {
  return apiRequest<Product[]>("/products");
}

export function getProduct(id: number) {
  return apiRequest<Product>(`/products/${id}`);
}

export function saveProduct(payload: ProductSavePayload) {
  return apiRequest<Product>("/products", { method: "POST", body: payload });
}

export function listOrganizations() {
  return apiRequest<Organization[]>("/organizations");
}

export function saveOrganization(payload: {
  id?: number;
  name: string;
  is_internal?: boolean;
}) {
  return apiRequest<Organization>("/organizations", { method: "POST", body: payload });
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
  return apiRequest<ProductAccessItem[]>(`/product-access${qs ? `?${qs}` : ""}`);
}

export function grantAccess(organization_id: number, product_id: number) {
  return apiRequest<ProductAccessItem>("/product-access/grant", {
    method: "POST",
    body: { organization_id, product_id },
  });
}

export function revokeAccess(organization_id: number, product_id: number) {
  return apiRequest<ProductAccessItem>("/product-access/revoke", {
    method: "POST",
    body: { organization_id, product_id },
  });
}

export function listPeople(params?: { search?: string; organization_id?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.organization_id) q.set("organization_id", String(params.organization_id));
  const qs = q.toString();
  return apiRequest<Person[]>(`/people${qs ? `?${qs}` : ""}`);
}

export function savePerson(payload: PersonSavePayload) {
  return apiRequest<Person>("/people", { method: "POST", body: payload });
}

export function assignProduct(user_id: string, product_id: number) {
  return apiRequest<Person>("/people/assign-product", {
    method: "POST",
    body: { user_id, product_id },
  });
}

export function removeProduct(user_id: string, product_id: number) {
  return apiRequest<Person>("/people/remove-product", {
    method: "POST",
    body: { user_id, product_id },
  });
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

export function myProducts() {
  return apiRequest<Product[]>("/me/products");
}

export function enterProduct(code: string) {
  return apiRequest<{ product: Product; message: string }>(`/products/${code}/enter`, {
    method: "POST",
  });
}
