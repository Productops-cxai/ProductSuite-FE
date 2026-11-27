/** Adaptive workflow contracts. Field names match the PayFlow API. */

export interface PayflowAdaptiveFollowUpLevel {
  level: number;
  name: string;
  step_title?: string | null;
}

export interface PayflowAdaptiveFollowUpType {
  follow_up_for: string;
  label: string;
  trigger: string;
  waiting_hours?: number | null;
  needs_payment_plans?: boolean | null;
  levels: PayflowAdaptiveFollowUpLevel[];
}

export interface PayflowAdaptiveFollowUpTypesResponse {
  items: PayflowAdaptiveFollowUpType[];
}

export interface PayflowAdaptiveNextStep {
  step_id?: string | null;
  kind?: string | null;
  title?: string | null;
  at?: string | null;
  not_before?: string | null;
}

export interface PayflowAdaptiveLinedUp {
  replace_step_id?: string | null;
  replace_title?: string | null;
  follow_up_step_id?: string | null;
  follow_up_title?: string | null;
  follow_up_level?: number | null;
}

export interface PayflowAdaptivePreview {
  step_id?: string | null;
  title?: string | null;
  level?: number | null;
  version?: string | null;
  version_label?: string | null;
  language?: string | null;
  subject?: string | null;
  body?: string | null;
  sms_body?: string | null;
}

export interface PayflowAdaptiveDecisionOutcome {
  expired_reason?: string | null;
  error?: string | null;
  ai_decision?: { action?: string | null; reason?: string | null } | null;
  reviewer?: { action?: string | null } | null;
}

export type PayflowAdaptiveAction =
  | "use_follow_up"
  | "drop_follow_up"
  | "move_next"
  | "switch_channel"
  | "recheck_at"
  | "to_operations"
  | "pause"
  | "stop"
  | "keep_plan"
  | string;

export interface PayflowAdaptiveDecision {
  id: number;
  run_id?: number | null;
  account_id?: number | null;
  strategy_id?: number | null;
  client_id?: number | null;
  decided_by?: string | null;
  action: PayflowAdaptiveAction;
  replace_step_id?: string | null;
  follow_up_step_id?: string | null;
  at?: string | null;
  channel?: string | null;
  reason?: string | null;
  confidence?: number | null;
  needs_approval?: boolean | null;
  status?: string | null;
  decided_by_user?: string | null;
  decision_note?: string | null;
  decided_at?: string | null;
  executed_at?: string | null;
  /** Set when the decision sent the case to Human Review. */
  human_review_id?: number | null;
  outcome?: PayflowAdaptiveDecisionOutcome | null;
  created_at?: string | null;
  replace_title?: string | null;
  follow_up_title?: string | null;
  preview?: PayflowAdaptivePreview | null;
}

export interface PayflowAdaptiveEvent {
  type?: string | null;
  at?: string | null;
  detail?: Record<string, unknown> | null;
}

export interface PayflowAdaptiveMessage {
  communication_id?: number | null;
  step_id?: string | null;
  title?: string | null;
  channel?: string | null;
  status?: string | null;
  sent_at?: string | null;
  version?: string | null;
  version_label?: string | null;
  follow_up?: boolean | null;
  follow_up_level?: number | null;
  follow_up_for?: string | null;
  replaced_step_id?: string | null;
  replaced_title?: string | null;
}

export interface PayflowAdaptiveFollowUpUsage {
  step_id: string;
  follow_up_for?: string | null;
  level: number;
  title?: string | null;
  state?: string | null;
  sent_at?: string | null;
  replaced_step_id?: string | null;
  replaced_title?: string | null;
  last_failed?: boolean | null;
}

export interface PayflowAdaptiveSnapshot {
  run_id?: number | null;
  account_id?: number | null;
  client_id?: number | null;
  strategy_id?: number | null;
  adaptive?: boolean | null;
  engagement_state?: string | null;
  preferred_channel?: string | null;
  last_reassessed_at?: string | null;
  next_scheduled?: PayflowAdaptiveNextStep | null;
  next_message?: PayflowAdaptiveNextStep | null;
  swaps?: Record<string, string> | null;
  lined_up?: PayflowAdaptiveLinedUp[] | null;
  decisions?: PayflowAdaptiveDecision[] | null;
  events?: PayflowAdaptiveEvent[] | null;
  messages?: PayflowAdaptiveMessage[] | null;
  follow_ups?: PayflowAdaptiveFollowUpUsage[] | null;
}

export interface PayflowAdaptiveReassessResponse {
  run_id: number;
  job_id?: number | null;
  scheduled_at?: string | null;
}

export interface PayflowAdaptiveModifyPayload {
  action: "keep_plan" | "use_follow_up" | "move_next" | "switch_channel" | "recheck_at" | "to_operations";
  follow_up_step_id?: string;
  replace_step_id?: string;
  at?: string;
  channel?: "Email" | "SMS";
  note?: string;
}
