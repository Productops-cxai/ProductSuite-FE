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
  role_permission_names?: string[];
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

export interface PayflowClientSupervisor {
  user_id: string;
  full_name: string;
  email?: string | null;
  status?: string | null;
  short_name?: string;
  role_name?: string | null;
  permission_names?: string[];
}

export interface PayflowClient {
  // Back-compat fields relied on by UsersPage / ClientAssignmentPicker.
  id: number;
  code: string;
  name: string;
  category?: string | null;
  status: string;

  // Rich fields returned by GET /payflow/clients and GET /payflow/clients/{id}.
  industry?: string | null;
  status_label?: string;
  client_type?: string | null;
  client_type_label?: string | null;
  business_domain?: string | null;
  business_domain_label?: string | null;
  ai_mode?: string | null;
  ai_mode_label?: string | null;
  data_source_type?: string | null;
  connection_status?: string | null;
  connection_status_label?: string | null;
  supervisors?: PayflowClientSupervisor[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayflowClientMapping {
  id: number;
  source_field: string;
  payflow_field: string | null;
  sample_value: string | null;
  status: string; // mapped | needs_attention | unmapped | validated
  status_label: string;
  is_required: boolean;
  sort_order: number;
}

export interface PayflowClientMappingSummary {
  mapped: number;
  attention: number;
  unmapped: number;
  total: number;
  required_missing: string[];
}

export interface PayflowOnboardingStep {
  key: string;
  label: string;
  status: string; // complete | pending | incomplete | blocked
  informational?: boolean;
}

export interface PayflowOnboardingProgress {
  steps: PayflowOnboardingStep[];
  completed_required: number;
  total_required: number;
  percent: number;
  eligible_for_activation: boolean;
}

export interface PayflowPortfolio {
  id: number;
  client_id: number;
  name: string;
  code: string;
  status: string; // onboarding | active | paused
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayflowClientChannels {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface PayflowClientDetail extends PayflowClient {
  crm_system_name?: string | null;
  integration_ref?: string | null;
  environment?: string | null;
  sync_frequency?: string | null;
  brand_name: string;
  sender_name: string;
  email_from: string;
  sms_sender_id: string;
  channels: PayflowClientChannels;
  governance_rules: string[];
  mappings: PayflowClientMapping[];
  mapping_summary: PayflowClientMappingSummary;
  portfolios: PayflowPortfolio[];
  portfolio_count: number;
  supervisor_user_ids: string[];
  onboarding: PayflowOnboardingProgress;
  activation_blockers: string[];
}

export interface PayflowClientsListResponse {
  clients: PayflowClient[];
}

export interface PayflowMappingCatalogField {
  source_field: string;
  payflow_field: string;
  meaning: string;
  required: boolean;
  sample_value: string;
  group: string;
  available?: string;
}

export interface PayflowMappingOutboundField {
  file: string;
  field: string;
  meaning: string;
  required: boolean;
  format: string;
  sample_value: string;
  notes: string;
}

export interface PayflowMappingCatalogResponse {
  fields: PayflowMappingCatalogField[];
  outbound_fields?: PayflowMappingOutboundField[];
  payflow_fields: string[];
  governance_rules: string[];
  catalog_version?: string;
}

export interface PayflowPortfoliosResponse {
  portfolios: PayflowPortfolio[];
}

export interface PayflowBulkUploadCreatedRow {
  row: number;
  id: number;
  code: string;
  name: string;
}

export interface PayflowBulkUploadErrorRow {
  row: number;
  code?: string | null;
  message: string;
}

export interface PayflowBulkUploadResult {
  created_count: number;
  error_count: number;
  created: PayflowBulkUploadCreatedRow[];
  errors: PayflowBulkUploadErrorRow[];
}

export interface PayflowAccountTimelineEvent {
  label: string;
  detail: string;
  at: string;
}

export interface PayflowAccount {
  id: number;
  client_id: number;
  client_code?: string | null;
  client_name?: string | null;
  portfolio_id?: number | null;
  portfolio_name?: string | null;
  customer_name: string;
  account_reference: string;
  case_reference: string;
  original_balance: number;
  outstanding_balance: number;
  recovered_balance: number;
  collection_status: string;
  current_workflow?: string | null;
  last_action?: string | null;
  next_action?: string | null;
  human_review: boolean;
  timeline: PayflowAccountTimelineEvent[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayflowAccountsIntake {
  files: number;
  latest_received_at: string;
  latest_assigned_at: string;
  accounts_in_files: number;
}

export interface PayflowAccountsListResponse {
  accounts: PayflowAccount[];
  intake: PayflowAccountsIntake;
  workflows: string[];
  statuses: string[];
}

export interface PayflowIntegrationIssue {
  at: string;
  summary: string;
}

export interface PayflowIntegrationMapping {
  source_field: string;
  payflow_field?: string | null;
  sample_value?: string | null;
  status: string;
}

export interface PayflowIntegrationMappingSummary {
  mapped: number;
  attention: number;
  unmapped: number;
  total: number;
}

export interface PayflowIntegration {
  id: string;
  name: string;
  category: string;
  client_id?: number | null;
  client_name: string;
  client_code?: string | null;
  status: string;
  last_activity: string;
  last_successful?: string | null;
  purpose: string;
  data_source?: string | null;
  issues: PayflowIntegrationIssue[];
  mappings?: PayflowIntegrationMapping[];
  mapping_summary?: PayflowIntegrationMappingSummary | null;
}

export interface PayflowIntegrationsSummary {
  connected: number;
  attention: number;
  pending: number;
  disconnected: number;
}

export interface PayflowIntegrationsListResponse {
  integrations: PayflowIntegration[];
  summary: PayflowIntegrationsSummary;
  categories: string[];
  statuses: string[];
}

