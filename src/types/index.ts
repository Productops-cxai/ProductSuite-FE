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
  avatar_url?: string | null;
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

export interface PayflowNotification {
  id: number;
  notification_type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  client_id?: number | null;
  entity_type?: string | null;
  entity_id?: string | null;
  read: boolean;
  read_at?: string | null;
  created_at?: string | null;
}

export interface PayflowNotificationsListResponse {
  notifications: PayflowNotification[];
  unread_count: number;
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
  role_permission_codes?: string[];
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
  status_label?: string;
  description?: string | null;
  account_count?: number;
  case_count?: number;
  outstanding?: number;
  active_strategy_id?: number | null;
  active_strategy_name?: string | null;
  last_file_received?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayflowPortfolioDetail extends PayflowPortfolio {
  client_name: string;
  client_code?: string | null;
  strategies: {
    id: number;
    name: string;
    code: string;
    status: string;
    origin?: string | null;
    version?: number | null;
    updated_at?: string | null;
  }[];
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
  logo_url?: string | null;
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

export interface PayflowReviewContextItem {
  label: string;
  value: string;
}

export interface PayflowReviewTimelineItem {
  at: string;
  label: string;
}

export interface PayflowReviewHistoryItem {
  at: string;
  event: string;
  detail?: string | null;
  by?: string | null;
}

export interface PayflowReview {
  id: number;
  code: string;
  client_id: number;
  client_code?: string | null;
  client_name?: string | null;
  account_id: number;
  customer_name?: string | null;
  account_reference?: string | null;
  case_reference?: string | null;
  original_balance: number;
  outstanding_balance: number;
  recovered_balance: number;
  days_past_due: number;
  current_workflow?: string | null;
  priority: string;
  reason: string;
  rule_id?: number | null;
  rule_code?: string | null;
  rule_name?: string | null;
  condition_text?: string | null;
  observed_value?: string | null;
  proposed_action: string;
  confidence?: number | null;
  explanation: string[];
  context: PayflowReviewContextItem[];
  timeline: PayflowReviewTimelineItem[];
  waiting_minutes: number;
  waiting_label?: string | null;
  status: string;
  assigned_supervisor?: string | null;
  final_action?: string | null;
  guidance?: string | null;
  rejection_reason?: string | null;
  hold_until?: string | null;
  history: PayflowReviewHistoryItem[];
  can_decide?: boolean | null;
  can_modify?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayflowReviewsSummary {
  awaiting: number;
  high_priority: number;
  due_today: number;
  on_hold: number;
}

export interface PayflowReviewsListResponse {
  reviews: PayflowReview[];
  summary: PayflowReviewsSummary;
  statuses: string[];
  priorities: string[];
  reasons: string[];
  proposed_actions: string[];
  rejection_reasons: string[];
  waiting_buckets: string[];
}

export interface PayflowRuleCondition {
  id?: string | null;
  field: string;
  operator: string;
  value: string;
}

export interface PayflowRuleHistoryItem {
  at: string;
  change: string;
  by: string;
}

export interface PayflowRuleRecentTrigger {
  review_id: number;
  review_code: string;
  customer_name?: string | null;
  account_reference?: string | null;
  client_name?: string | null;
  status: string;
  waiting_minutes: number;
}

export interface PayflowRule {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  rule_type: string;
  client_id?: number | null;
  client_code?: string | null;
  client_name?: string | null;
  category: string;
  logic: string;
  conditions: PayflowRuleCondition[];
  condition_summary?: string | null;
  action: string;
  status: string;
  created_by?: string | null;
  triggers_7d: number;
  applied_to: string[];
  history: PayflowRuleHistoryItem[];
  can_edit?: boolean | null;
  recent_triggers?: PayflowRuleRecentTrigger[];
  created_at?: string | null;
  updated_at?: string | null;
  last_updated_label?: string | null;
}

export interface PayflowRulesSummary {
  active: number;
  system: number;
  client: number;
  triggers_7d: number;
}

export interface PayflowRuleFieldCatalogItem {
  label: string;
  category: string;
  type: string;
  options?: string[] | null;
}

export interface PayflowRulesListResponse {
  rules: PayflowRule[];
  summary: PayflowRulesSummary;
  can_create: boolean;
  categories: string[];
  actions: string[];
  fields: PayflowRuleFieldCatalogItem[];
  statuses: string[];
  types: string[];
  logics: string[];
}

export interface PayflowStrategyStep {
  id?: string | null;
  kind: string;
  title: string;
  channel?: string | null;
  purpose?: string | null;
  timing?: string | null;
  detail?: string | null;
  disabled?: boolean;
}

export interface PayflowStrategyVersion {
  version: number;
  date: string;
  note: string;
}

export interface PayflowStrategyStats {
  steps: number;
  branches: number;
  emails: number;
  sms: number;
}

export interface PayflowStrategyContextItem {
  label: string;
  value: string;
}

export interface PayflowStrategy {
  id: number;
  code: string;
  name: string;
  client_id: number;
  client_code?: string | null;
  client_name?: string | null;
  portfolio_id?: number | null;
  portfolio_name?: string | null;
  status: string;
  origin: string;
  version: number;
  summary?: string | null;
  coverage?: string | null;
  segment: Record<string, string>;
  steps: PayflowStrategyStep[];
  stats: PayflowStrategyStats;
  ai_context: PayflowStrategyContextItem[];
  versions: PayflowStrategyVersion[];
  approved_by?: string | null;
  approval_date?: string | null;
  created_by?: string | null;
  last_updated_label?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayflowStrategiesSummary {
  total: number;
  ai_proposed: number;
  active: number;
  under_review: number;
}

export interface PayflowStrategiesListResponse {
  strategies: PayflowStrategy[];
  summary: PayflowStrategiesSummary;
  statuses: string[];
  step_kinds: string[];
}

export interface PayflowCommEvent {
  at: string;
  label: string;
  detail?: string | null;
}

export interface PayflowCommunication {
  id: number;
  code: string;
  client_id: number;
  client_code?: string | null;
  client_name?: string | null;
  account_id: number;
  customer_name?: string | null;
  account_reference?: string | null;
  case_reference?: string | null;
  channel: string;
  purpose: string;
  status: string;
  workflow_name?: string | null;
  engagement?: string | null;
  date_bucket?: string | null;
  date_label?: string | null;
  time_label?: string | null;
  subject?: string | null;
  body_lines: string[];
  payment_link: boolean;
  why_message?: string | null;
  why_channel?: string | null;
  why_timing?: string | null;
  events: PayflowCommEvent[];
  balance: number;
  review_id?: number | null;
  drop_off_segment?: string | null;
  brand_name?: string | null;
  sender_name?: string | null;
  email_from?: string | null;
  sms_sender_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayflowCommunicationsSummary {
  sent_today: number;
  delivered: number;
  engaged: number;
  clicks: number;
  failed: number;
}

export interface PayflowCommunicationsListResponse {
  communications: PayflowCommunication[];
  summary: PayflowCommunicationsSummary;
  drop_off: Record<string, number>;
  statuses: string[];
  channels: string[];
  purposes: string[];
  workflows: string[];
  drop_off_segments: string[];
}

export interface PayflowDashboardKpi {
  id: string;
  label: string;
  value: number;
  display: string;
  hint?: string | null;
  tone: "neutral" | "primary" | string;
  href?: string | null;
}

export interface PayflowDashboardAttention {
  id: string;
  label: string;
  count: number;
  tone: string;
  href?: string | null;
}

export interface PayflowDashboardFunnelStep {
  step: string;
  label: string;
  value: number;
  display: string;
  rate?: string | null;
  drop?: string | null;
  bar: number;
  paid: boolean;
}

export interface PayflowDashboardOutcome {
  id: string;
  label: string;
  value: number;
  display: string;
  href?: string | null;
}

export interface PayflowDashboardClientAttention {
  client_id: number;
  name: string;
  reviews: number;
  flagged_accounts: number;
  detail: string;
  badge: string;
  tone: string;
  href?: string | null;
}

export interface PayflowDashboardActivity {
  id: number;
  text: string;
  when: string;
  href?: string | null;
  created_at?: string | null;
}

export interface PayflowDashboardClientOption {
  id: number;
  name: string;
  code: string;
  status: string;
}

export interface PayflowDashboardResponse {
  description: string;
  filters: {
    date_range?: string;
    client_id?: number | null;
    channel?: string | null;
    workflow?: string | null;
  };
  clients: PayflowDashboardClientOption[];
  channels: string[];
  workflows: string[];
  kpis: PayflowDashboardKpi[];
  attention: PayflowDashboardAttention[];
  funnel: PayflowDashboardFunnelStep[];
  outcomes: PayflowDashboardOutcome[];
  clients_attention: PayflowDashboardClientAttention[];
  activity: PayflowDashboardActivity[];
}

