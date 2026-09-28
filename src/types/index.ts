export type LoginNextStep =
  | "platform_admin"
  | "product_selection"
  | "direct_entry"
  | "no_access";

export interface ProductBrief {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  status: string;
}

export interface PersonBrief {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  organization_id: number;
  organization_name?: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: PersonBrief;
  products: ProductBrief[];
  next_step: LoginNextStep;
}

export interface MeResponse {
  user: PersonBrief;
  products: ProductBrief[];
  next_step: LoginNextStep;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  name: string;
  is_internal: boolean;
  created_at: string;
}

export interface ProductSummary {
  id: number;
  name: string;
  code: string;
  status: string;
}

export interface OrgAccessSummary {
  id: number;
  name: string;
  has_access: boolean;
}

export interface OverviewResponse {
  registered_products_count: number;
  active_products_count: number;
  organizations_with_access_count: number;
  organizations_total_count: number;
  organizations_with_access_label: string;
  products_summary: ProductSummary[];
  org_access_summary: OrgAccessSummary[];
}

export interface MenuItem {
  key: string;
  label: string;
  route: string;
  icon?: string | null;
  sort_order: number;
  is_coming_soon: boolean;
  badge?: string | null;
}

export interface MenuSection {
  key: string;
  label: string;
  sort_order: number;
  items: MenuItem[];
}

export interface MenusResponse {
  sections: MenuSection[];
}

export interface ProductAccessItem {
  entitlement_id?: number | null;
  organization_id: number;
  organization_name: string;
  product_id: number;
  product_name: string;
  product_code: string;
  access_status: "granted" | "revoked" | string;
}

export interface AssignedProduct {
  id: number;
  name: string;
  code: string;
  effectively_entitled: boolean;
}

export interface Person {
  id: string;
  full_name: string;
  email: string;
  organization_id: number;
  organization_name: string;
  role: string;
  status: string;
  assigned_products: AssignedProduct[];
  created_at: string;
  activation_link?: string | null;
}

export interface EmailLog {
  id: number;
  to_email: string;
  subject: string;
  body: string;
  email_type: string;
  action_link?: string | null;
  related_user_id?: string | null;
  status: string;
  created_at: string;
}

export interface ProductSavePayload {
  id?: number;
  name: string;
  code?: string;
  description?: string;
  status?: string;
}

export interface PersonSavePayload {
  id?: string;
  full_name: string;
  email?: string;
  organization_id: number;
  status?: string;
  product_ids?: number[];
}

export interface ActivationPreview {
  email: string;
  full_name: string;
}

// ---- PayFlow ----

export interface PayflowRoleSummary {
  id: number;
  code: string;
  name: string;
  scope: string;
  description?: string | null;
}

export interface PayflowAccessContext {
  product_code: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string;
  role: PayflowRoleSummary;
  is_operations_admin: boolean;
  client_ids: number[];
  permissions_by_client: Record<string, string[]>;
  all_permissions: string[];
}

export interface PayflowUser {
  id: string;
  full_name: string;
  email: string;
  role_code: string;
  role_name: string;
  role_scope: string;
  status: string;
  status_label: string;
  assigned_clients: string[];
  permission_profile: string;
  last_active?: string | null;
  created_at?: string | null;
  organization_id?: number;
  organization_name?: string | null;
  activation_link?: string | null;
}

export interface PayflowUsersListResponse {
  users: PayflowUser[];
  total: number;
  summary: {
    total_users: number;
    roles: number;
    platform_wide_access: number;
    client_scoped_users: number;
    active_users: number;
  };
}

export interface PayflowRoleListItem {
  id: number;
  code: string;
  name: string;
  scope: string;
  description?: string | null;
  is_built_in: boolean;
  permission_count: number;
  permission_codes: string[];
  user_count: number;
}

export interface PayflowPermissionItem {
  code: string;
  name: string;
  group_key: string;
  sort_order: number;
}

export interface PayflowPermissionGroup {
  group_key: string;
  group_label: string;
  permissions: PayflowPermissionItem[];
}

export interface PayflowClient {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  status: string;
}

