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

export interface SmsLog {
  id: number;
  to_phone: string;
  body: string;
  sms_type: string;
  status: string;
  provider_id?: string | null;
  error?: string | null;
  account_id?: number | null;
  account_reference?: string | null;
  customer_name?: string | null;
  run_id?: number | null;
  client_id?: number | null;
  client_name?: string | null;
  client_code?: string | null;
  created_at: string;
}

export interface PayflowWorkflowWorkerLog {
  id: number;
  event_type: string;
  level: string;
  message: string;
  detail?: string | null;
  client_id?: number | null;
  client_name?: string | null;
  client_code?: string | null;
  portfolio_id?: number | null;
  portfolio_name?: string | null;
  portfolio_code?: string | null;
  account_id?: number | null;
  account_reference?: string | null;
  customer_name?: string | null;
  strategy_id?: number | null;
  strategy_name?: string | null;
  strategy_code?: string | null;
  run_id?: number | null;
  job_id?: number | null;
  step_id?: string | null;
  created_at?: string | null;
  event_count?: number | null;
  group_key?: string | null;
  step_summary?: string | null;
  related_events?: PayflowWorkflowWorkerLog[] | null;
}

export interface PayflowWorkflowWorkerLogsResponse {
  items: PayflowWorkflowWorkerLog[];
}

export type PayflowWorkflowUiStatus =
  | "Pending"
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Blocked"
  | "Failed"
  | "Cancelled"
  | string;

export interface PayflowWorkflowStepRun {
  id: number;
  step_id: string;
  kind: string;
  title?: string | null;
  attempt: number;
  status: string;
  ui_status?: PayflowWorkflowUiStatus | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
  block_reason?: string | null;
  result_json?: Record<string, unknown> | null;
  communication_id?: number | null;
}

export interface PayflowWorkflowActivityItem {
  at?: string | null;
  label: string;
  kind?: string | null;
  detail?: string | null;
  ui_status?: PayflowWorkflowUiStatus | null;
  step_id?: string | null;
  step_run_id?: number | null;
  communication_id?: number | null;
  human_review_id?: number | null;
  block_reason?: string | null;
  error?: string | null;
}

export interface PayflowWorkflowRun {
  id: number;
  account_id: number;
  strategy_id: number;
  strategy_version?: number | null;
  strategy_name?: string | null;
  strategy_code?: string | null;
  workflow_definition_path?: string | null;
  client_id?: number | null;
  portfolio_id?: number | null;
  status: string;
  current_step_id?: string | null;
  current_step?: { id?: string | null; title?: string | null; kind?: string | null } | null;
  next_step_id?: string | null;
  next_step_title?: string | null;
  next_scheduled_at?: string | null;
  human_review_id?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  last_error?: string | null;
  block_reason?: string | null;
  deactivate_policy?: string | null;
  step_runs?: PayflowWorkflowStepRun[];
  activity?: PayflowWorkflowActivityItem[];
}

export interface PayflowAccountWorkflowExecutionResponse {
  execution: PayflowWorkflowRun | null;
}

export interface AiSuggestJob {
  id: number;
  client_id: number;
  client_name?: string | null;
  client_code?: string | null;
  portfolio_id: number;
  portfolio_name?: string | null;
  portfolio_code?: string | null;
  trigger: string;
  status: string;
  skip_reason?: string | null;
  error_message?: string | null;
  requested_by_user_id?: string | null;
  import_run_id?: number | null;
  workflows_created: number;
  workflow_ids: number[];
  segments_count?: number | null;
  batches_count?: number | null;
  groq_calls?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface DeletionLog {
  id: number;
  module: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  activity: string;
  source?: string | null;
  actor_user_id?: string | null;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  record_snapshot?: Record<string, unknown> | unknown[] | null;
  related_deleted: Array<{ entity_type?: string; id?: string; label?: string }>;
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
  /** Required config labels still incomplete (excludes portfolios / activation). */
  setup_incomplete?: string[];
  /** Concrete remaining issues across config tabs (branding, supervisors, …). */
  setup_issues?: string[];
  setup_steps_remaining?: number;
  onboarding?: PayflowOnboardingProgress;
  /** How the client was first created: add_client | file_upload */
  added_through?: string | null;
  added_through_label?: string | null;
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
  crm_client_number?: string | null;
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
  crm_client_number?: string | null;
  contact_name?: string | null;
  contact_title?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  province_state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  correspondence_language?: string | null;
  currency_code?: string | null;
  crm_status?: string | null;
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
  /** Which ingest file: daily_accounts | client_hierarchy */
  feed?: string;
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
  /** Back-compat: daily account file mappings */
  fields: PayflowMappingCatalogField[];
  account_fields?: PayflowMappingCatalogField[];
  client_fields?: PayflowMappingCatalogField[];
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
  import_id?: number | null;
  status?: string;
  message?: string | null;
  summary?: PayflowImportPreviewSummary;
  preview?: PayflowImportPreviewRecord[];
}

export interface PayflowImportPreviewRecord {
  id: string;
  record_id: string;
  client: string;
  sub_client: string;
  client_name: string;
  sub_client_name: string;
  action: string;
  client_code?: string | null;
  is_sub?: boolean;
  current_balance?: number | null;
  incoming_balance?: number | null;
  note?: string | null;
  setup_issues?: string[];
}

export interface PayflowImportPreviewSummary {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  rejected?: number;
  successful?: number;
  new_clients: number;
  existing_clients: number;
  new_sub_clients?: number;
  existing_sub_clients?: number;
}

export interface PayflowImportPreviewResponse {
  ok: boolean;
  file_name: string;
  status: string;
  message?: string | null;
  summary: PayflowImportPreviewSummary;
  preview: PayflowImportPreviewRecord[];
  errors: Array<{
    record_id: string;
    client: string;
    sub_client: string;
    field: string;
    error: string;
    status: string;
  }>;
}

export interface PayflowAccountTimelineEvent {
  label: string;
  detail: string;
  at: string;
  review_id?: number | null;
  source?: string | null;
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
  portfolio_code?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  date_of_birth?: string | null;
  age_group?: string | null;
  employment_status?: string | null;
  income_band?: string | null;
  education_level?: string | null;
  customer_segment?: string | null;
  address_line1?: string | null;
  city?: string | null;
  province_state?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  region?: string | null;
  email?: string | null;
  phone_mobile?: string | null;
  phone_work?: string | null;
  language?: string | null;
  currency_code?: string | null;
  fee_amount?: number | null;
  due_date?: string | null;
  days_past_due?: number | null;
  last_payment_amount?: number | null;
  last_payment_date?: string | null;
  last_payment_is_ptp?: boolean | null;
  ptp_code?: string | null;
  ptp_amount?: number | null;
  ptp_due_date?: string | null;
  account_status?: string | null;
  account_category?: string | null;
  negative_balance_reason?: string | null;
  crm_case_id?: string | null;
  debtor_id?: string | null;
  client_reference_number?: string | null;
  product_code?: string | null;
  date_listed?: string | null;
  date_incurred?: string | null;
  delinquency_date?: string | null;
  paid_amount?: number | null;
  settlement_rate?: number | null;
  commission_rate?: number | null;
  last_email_sent_date?: string | null;
  last_sms_sent_date?: string | null;
  last_contact_date?: string | null;
  provincial_hold?: boolean | null;
  hold_days?: number | null;
  email_consent?: boolean | null;
  source_updated_at?: string | null;
  last_crm_refresh_at?: string | null;
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

export interface PayflowImportErrorItem {
  record_id: string;
  client: string;
  sub_client: string;
  field: string;
  error: string;
  status: string;
}

export interface PayflowImportCounts {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  rejected?: number;
  successful?: number;
}

export interface PayflowImportRun {
  id: number;
  kind: string;
  file_name: string;
  date_time: string;
  uploaded_by: string;
  status: string;
  counts: PayflowImportCounts;
  errors: PayflowImportErrorItem[];
}

export interface PayflowImportListResponse {
  imports: PayflowImportRun[];
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

export interface PayflowReviewExceptionStep {
  id?: string | null;
  title?: string | null;
  kind?: string | null;
  available?: boolean;
  message?: string | null;
}

export interface PayflowReviewExecutionSummary {
  run_id?: number | null;
  status?: string | null;
  strategy_id?: number | null;
  strategy_name?: string | null;
  strategy_version?: number | null;
  current_step_id?: string | null;
  current_step_title?: string | null;
  current_step_kind?: string | null;
  next_step_id?: string | null;
  next_step_title?: string | null;
  next_scheduled_at?: string | null;
  block_reason?: string | null;
  workflow_definition_path?: string | null;
}

export interface PayflowReviewMissingRef {
  ref: string;
  message: string;
}

export interface PayflowReviewWorkflowContext {
  strategy_id?: number | null;
  strategy_name?: string | null;
  strategy_code?: string | null;
  strategy_available?: boolean | null;
  workflow_version?: number | null;
  exception_step_id?: string | null;
  exception_step?: PayflowReviewExceptionStep | null;
  current_workflow?: string | null;
  collection_status?: string | null;
  last_action?: string | null;
  next_action?: string | null;
  action_blocked?: boolean;
  execution?: PayflowReviewExecutionSummary | null;
  workflow_definition_path?: string | null;
}

export interface PayflowReviewCommunication {
  id: number;
  code: string;
  channel: string;
  purpose: string;
  status: string;
  engagement?: string | null;
  date_label?: string | null;
  time_label?: string | null;
  subject?: string | null;
}

export interface PayflowReviewAuditItem {
  id: number;
  event: string;
  detail?: string | null;
  actor_name?: string | null;
  before_status?: string | null;
  after_status?: string | null;
  created_at?: string | null;
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
  portfolio_id?: number | null;
  portfolio_name?: string | null;
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
  audit_trail?: PayflowReviewAuditItem[];
  communications?: PayflowReviewCommunication[];
  workflow_context?: PayflowReviewWorkflowContext | null;
  exception_step_id?: string | null;
  exception_step?: PayflowReviewExceptionStep | null;
  strategy_id?: number | null;
  workflow_version?: number | null;
  decision_version?: number | null;
  missing_refs?: PayflowReviewMissingRef[];
  available_actions?: string[];
  can_decide?: boolean | null;
  can_modify?: boolean | null;
  can_release?: boolean | null;
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

export interface PayflowStrategyStepConfig {
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
  /** Lovable catalog reason shown in Human Review queue (not the step title). */
  review_reason?: string | null;
  template_id?: string | null;
}

export interface PayflowStrategyStep {
  id?: string | null;
  kind: string;
  title: string;
  origin?: string | null;
  disabled?: boolean;
  config?: PayflowStrategyStepConfig | null;
  next?: string | null;
  yes?: string | null;
  no?: string | null;
  channel?: string | null;
  purpose?: string | null;
  timing?: string | null;
  detail?: string | null;
}

export interface PayflowStrategyVersion {
  id?: number | null;
  version: number;
  date: string;
  note: string;
  status?: string | null;
  origin?: string | null;
  approved_by?: string | null;
  approval_date?: string | null;
  steps?: PayflowStrategyStep[] | null;
  segment?: Record<string, string> | null;
  changes?: string[];
  reviewer_note?: string | null;
}

export interface PayflowStrategyStats {
  steps: number;
  branches: number;
  emails: number;
  sms: number;
  payment_actions?: number;
  case_actions?: number;
}

export interface PayflowStrategyContextItem {
  label: string;
  value: string;
}

export interface PayflowMessageTemplate {
  id: string;
  name: string;
  channel: string;
  purpose: string;
  subject?: string | null;
  body?: string | null;
}

export interface PayflowStrategyCatalog {
  channels?: string[];
  message_purposes?: string[];
  reference_events?: string[];
  time_units?: string[];
  time_directions?: string[];
  condition_attributes?: string[];
  condition_operators?: string[];
  condition_values?: Record<string, string[]>;
  case_actions?: string[];
  payment_actions?: string[];
  outcomes?: string[];
  age_bands?: string[];
  postal_regions?: string[];
  balance_bands?: string[];
  delinquency_bands?: string[];
  language_preferences?: string[];
  languages?: string[];
  tenure_bands?: string[];
  tenures?: string[];
  excluded_targeting_attributes?: string[];
  message_templates?: PayflowMessageTemplate[];
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
  source?: string | null;
  version: number;
  summary?: string | null;
  coverage?: string | null;
  cases_covered?: number | null;
  segment: Record<string, string>;
  entry_node_id?: string | null;
  steps: PayflowStrategyStep[];
  stats: PayflowStrategyStats;
  ai_context: PayflowStrategyContextItem[];
  ai_proposal_snapshot?: Record<string, unknown> | null;
  revision_of_id?: number | null;
  versions: PayflowStrategyVersion[];
  approved_by?: string | null;
  approval_date?: string | null;
  reviewed_by?: string | null;
  created_by?: string | null;
  human_modified?: boolean;
  awaiting_review?: boolean;
  last_updated_label?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayflowStrategiesSummary {
  total: number;
  ai_proposed: number;
  draft?: number;
  under_review: number;
  approved?: number;
  active: number;
  inactive?: number;
  awaiting_review?: number;
}

export interface PayflowStrategiesListResponse {
  strategies: PayflowStrategy[];
  summary: PayflowStrategiesSummary;
  statuses: string[];
  step_kinds: string[];
  origins?: string[];
  sources?: string[];
  catalog?: PayflowStrategyCatalog;
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
  case_status?: string | null;
  channel: string;
  purpose: string;
  status: string;
  workflow_name?: string | null;
  engagement?: string | null;
  engagement_tracking?: string | null;
  date_bucket?: string | null;
  date_label?: string | null;
  time_label?: string | null;
  subject?: string | null;
  body_lines: string[];
  payment_link: boolean;
  payment_link_url?: string | null;
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
  provider?: string | null;
  provider_message_id?: string | null;
  recipient?: string | null;
  provider_error?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  opens_count?: number;
  clicks_count?: number;
  first_opened_at?: string | null;
  last_opened_at?: string | null;
  first_clicked_at?: string | null;
  last_clicked_at?: string | null;
  last_clicked_url?: string | null;
  days_since_delivery_without_open?: number | null;
  days_since_delivery_without_click?: number | null;
  payment_initiated?: boolean;
  payment_completed?: boolean;
  eligibility_status?: string | null;
  restriction_reason?: string | null;
  rule_id?: number | null;
  rule_name?: string | null;
  rule_code?: string | null;
  next_eligible_at?: string | null;
  can_view_rule?: boolean;
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
  total?: number;
  limit?: number;
  offset?: number;
}

export interface PayflowCommunicationEligibility {
  email: { ok?: boolean; eligibility_status?: string; restriction_reason?: string | null; next_eligible_at?: string | null };
  sms: { ok?: boolean; eligibility_status?: string; restriction_reason?: string | null; next_eligible_at?: string | null };
  latest_restriction_reason?: string | null;
  latest_eligibility_status?: string | null;
  next_eligible_at?: string | null;
  rule_id?: number | null;
  rule_name?: string | null;
  rule_code?: string | null;
  can_view_rule?: boolean;
  communication_id?: number | null;
}

export interface PayflowOperationalException {
  id: number;
  exception_type: string;
  severity: string;
  status: string;
  retriable: boolean;
  client_id?: number | null;
  client_name?: string | null;
  account_id?: number | null;
  account_reference?: string | null;
  customer_name?: string | null;
  case_reference?: string | null;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  reason: string;
  diagnostic_ref?: string | null;
  link?: string | null;
  dedupe_key: string;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayflowOperationalExceptionsListResponse {
  exceptions: PayflowOperationalException[];
  total: number;
  open_count: number;
  acknowledged_count: number;
  resolved_count: number;
}

export interface ManualSmsSendResponse {
  skipped?: string | null;
  communication_id?: number | null;
  code?: string | null;
  status?: string | null;
  comm_status?: string | null;
  recipient?: string | null;
  provider_error?: string | null;
  restriction_reason?: string | null;
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
  href?: string | null;
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

