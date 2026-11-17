/** Email subject performance contracts from PayFlow `/payflow` email-subject routes. */

export const REMINDER_STAGES = [
  "First reminder",
  "Second reminder",
  "Final reminder",
  "Payment plan",
  "Promise to pay",
] as const;

export interface EmailSubjectMetrics {
  sent: number;
  delivered: number;
  opens: number;
  open_rate: number;
  clicks: number;
  click_rate: number;
  payment_link_clicks: number;
  initiated: number;
  completed: number;
  emails_with_payment: number;
  conversion: number;
  manual_sent: number;
  low_sample: boolean;
}

export interface EmailSubjectRow extends EmailSubjectMetrics {
  subject_key: string;
  subject: string;
  variations: number;
  contexts: string[];
  reminder_stages: string[];
}

export interface EmailSubjectLeaders {
  opened: EmailSubjectRow | null;
  clicked: EmailSubjectRow | null;
  payments: EmailSubjectRow | null;
  conversion: EmailSubjectRow | null;
}

export interface EmailSubjectMeasurement {
  min_deliveries: number;
  attribution_window_days: number;
  attribution_rule: string;
  rate_denominator: string;
  opens_are_estimated: boolean;
}

export interface EmailSubjectNamedOption {
  id: number;
  name: string;
  client_id?: number | null;
}

export interface EmailSubjectFilterOptions {
  date_ranges: string[];
  clients: EmailSubjectNamedOption[];
  portfolios: EmailSubjectNamedOption[];
  workflows: EmailSubjectNamedOption[];
  reminder_stages: string[];
  purposes: string[];
}

export interface EmailSubjectsResponse {
  filter_options: EmailSubjectFilterOptions;
  measurement: EmailSubjectMeasurement;
  leaders: EmailSubjectLeaders;
  rows: EmailSubjectRow[];
  total: number;
  unattributed_payments: number;
}

export interface EmailSubjectFunnelStep {
  label: string;
  value: number;
  pct_of_sent: number;
}

export interface EmailSubjectTrendPoint {
  date: string;
  opens: number;
  clicks: number;
  payments: number;
}

export interface EmailSubjectBreakdownLine {
  id?: number | string | null;
  label: string;
  delivered: number;
  completed: number;
  conversion: number;
}

export interface EmailSubjectBodyVariation extends EmailSubjectMetrics {
  id?: number | null;
  label: string;
  subject?: string | null;
  body?: string | null;
  origin?: string | null;
  language?: string | null;
  reminder_stage?: string | null;
  first_used_at?: string | null;
  last_used_at?: string | null;
}

export interface EmailSubjectDetails {
  subject_key: string;
  subject: string;
  reminder_stages: string[];
  contexts: string[];
  summary: EmailSubjectRow;
  funnel: EmailSubjectFunnelStep[];
  period: string;
  trend: EmailSubjectTrendPoint[];
  breakdown: {
    by_client: EmailSubjectBreakdownLine[];
    by_workflow: EmailSubjectBreakdownLine[];
    by_stage: EmailSubjectBreakdownLine[];
  };
  variations: EmailSubjectBodyVariation[];
  similar: EmailSubjectRow[];
  measurement: EmailSubjectMeasurement;
}

export interface EmailSubjectFilters {
  date_range: string;
  date_from?: string;
  date_to?: string;
  client_id?: number;
  portfolio_ids?: number[];
  strategy_id?: number;
  reminder_stage?: string;
  purpose?: string;
  search?: string;
}

export interface EmailInsightRequest extends EmailSubjectFilters {
  scope: "subject" | "kpi" | "section";
  subject_key?: string;
  metric?: "opens" | "clicks" | "completed" | "conversion";
}

export interface EmailInsightResponse {
  subject_key?: string | null;
  subject?: string | null;
  insight: string;
  observations: string[];
  insufficient_data: boolean;
  evidence: Record<string, unknown>;
  generated_by: string;
  cached: boolean;
  disclaimer: string;
}

export interface EmailSubjectSuggestion {
  subject: string;
  explanation: string;
  measured: boolean;
  source_subject: string;
  metrics: EmailSubjectMetrics;
  low_sample: boolean;
  body?: string | null;
  body_origin?: string | null;
}

export interface EmailSubjectSuggestionsResponse {
  client_id: number;
  strategy_id?: number | null;
  reminder_stage: string;
  purpose: string;
  scope: string;
  rows: EmailSubjectSuggestion[];
  ai_generated: boolean;
  disclaimer: string;
}

export interface EmailMessageText {
  subject?: string | null;
  body?: string | null;
  origin?: string | null;
}

export interface EmailProposalAlternative {
  subject?: string;
  metrics?: Partial<EmailSubjectMetrics>;
}

export interface EmailProposalResult {
  status?: string;
  message_version_id?: number;
  metrics?: Partial<EmailSubjectMetrics>;
}

export interface EmailProposal {
  id: number;
  client_id: number;
  strategy_id: number;
  strategy_name?: string | null;
  step_id: string;
  step_title?: string | null;
  recommendation: string;
  status: string;
  existing: EmailMessageText;
  proposed?: EmailMessageText | null;
  alternative_subjects: EmailProposalAlternative[];
  explanation?: string | null;
  evidence: Record<string, unknown>;
  final?: EmailMessageText | null;
  decision_note?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  result?: EmailProposalResult | null;
}

export interface EmailProposalsResponse {
  items: EmailProposal[];
  total: number;
  pending: number;
}

export interface EmailDraftResponse {
  strategy_id?: number | null;
  step_id: string;
  existing: EmailMessageText;
  subject: string;
  body?: string | null;
  origin?: string | null;
  generated_by: string;
  explanation: string;
  evidence: Record<string, unknown>;
  saved: boolean;
  disclaimer: string;
}

export interface EmailLowPerformer {
  client_id: number;
  client_name?: string | null;
  strategy_id: number;
  strategy_name?: string | null;
  step_id: string;
  step_title?: string | null;
  subject: string;
  reminder_stage: string;
  purpose: string;
  recommendation: string;
  reason: string;
  metrics?: EmailSubjectMetrics | null;
  comparable_templates?: Record<string, unknown> | null;
  pending_proposal_id?: number | null;
}

export interface EmailLowPerformersResponse {
  items: EmailLowPerformer[];
  total: number;
  min_deliveries: number;
}

export interface EmailMessageHistoryItem extends EmailSubjectMetrics {
  id: number;
  step_id?: string | null;
  strategy_version?: number | null;
  reminder_stage?: string | null;
  purpose?: string | null;
  language?: string | null;
  origin?: string | null;
  audience?: string | null;
  audience_label?: string | null;
  subject?: string | null;
  body?: string | null;
  first_used_at?: string | null;
  last_used_at?: string | null;
  is_current_subject: boolean;
}

export interface EmailMessageHistoryResponse {
  strategy_id: number;
  strategy_name: string;
  items: EmailMessageHistoryItem[];
  total: number;
}

export interface EmailSubjectsTrendSeries {
  id?: number | string | null;
  label: string;
  totals: Record<string, number>;
  points: {
    date: string;
    delivered: number;
    opens: number;
    clicks: number;
    payments: number;
    conversion: number;
  }[];
}

export interface EmailSubjectsTrendResponse {
  group_by: string;
  period: string;
  dates: string[];
  series: EmailSubjectsTrendSeries[];
  more_groups: number;
}

export interface EmailWorkflowOptimizationResponse {
  strategy_id: number;
  strategy_name: string;
  proposals: EmailProposal[];
  disclaimer: string;
}
