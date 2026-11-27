import type { PayflowStrategyStep } from "../types";
import type {
  PayflowAdaptiveDecision,
  PayflowAdaptiveEvent,
  PayflowAdaptiveFollowUpType,
  PayflowAdaptiveFollowUpUsage,
  PayflowAdaptiveMessage,
  PayflowAdaptiveSnapshot,
} from "../types/adaptive";

/** Reminder stage stored and counted apart from the planned reminders. */
export const FOLLOW_UP_REMINDER_STAGE = "Follow-up";

export function followUpLevel(step: PayflowStrategyStep): number {
  const level = step.config?.follow_up_level;
  if (typeof level === "number" && Number.isFinite(level) && level >= 1) return level;
  return 1;
}

/** Written when the step has email or SMS text. A follow-up without text is never sent. */
export function followUpHasText(step: PayflowStrategyStep): boolean {
  const cfg = step.config || {};
  return !!(cfg.body?.trim() || cfg.sms_body?.trim());
}

export function formatAdaptiveStamp(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function languageDisplay(code?: string | null, fallback?: string | null): string {
  const raw = (code || fallback || "").trim();
  if (!raw) return "the client's main language";
  if (raw.length > 3 || /\s/.test(raw)) return raw;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(raw);
    if (name) return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    /* keep the code */
  }
  return raw;
}

export function waitingPeriodLabel(hours?: number | null): string {
  if (hours == null || Number.isNaN(hours)) return "Waiting period · pending configuration";
  const amount = Number(hours);
  const unit = amount === 1 ? "hour" : "hours";
  return `Waiting period · ${amount} ${unit}`;
}

const DECISION_TITLES: Record<string, string> = {
  use_follow_up: "Use follow-up",
  drop_follow_up: "Follow-up cancelled",
  move_next: "Next message moved",
  switch_channel: "Channel switched",
  recheck_at: "Check again later",
  to_operations: "Sent to Operations",
  pause: "Sent to Operations",
  stop: "Stopped",
  keep_plan: "No change",
};

export function decisionActionTitle(action?: string | null): string {
  if (!action) return "Decision";
  return DECISION_TITLES[action] || action.replace(/_/g, " ");
}

const STATUS_BADGES: Record<string, string> = {
  awaiting_approval: "Waiting approval",
  executed: "Applied",
  approved: "Approved",
  modified: "Changed",
  rejected: "Rejected",
  superseded: "Replaced",
  expired: "Expired",
  failed: "Failed",
};

export function decisionStatusBadge(status?: string | null): string {
  if (!status) return "—";
  return STATUS_BADGES[status] || status.replace(/_/g, " ");
}

export function decisionStatusTone(
  status?: string | null,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "executed":
    case "approved":
      return "success";
    case "awaiting_approval":
    case "expired":
      return "warning";
    case "rejected":
    case "failed":
      return "danger";
    case "modified":
      return "info";
    default:
      return "neutral";
  }
}

const EXPIRED_REASONS: Record<string, string> = {
  step_already_sent: "The planned message already went out",
  no_pending_step: "Nothing left to move",
  run_terminal: "The case's workflow has ended",
  run_missing: "The workflow run no longer exists",
};

export function expiredReasonLabel(reason?: string | null): string {
  if (!reason) return "It no longer applied";
  return EXPIRED_REASONS[reason] || reason.replace(/_/g, " ");
}

const DECIDED_BY: Record<string, string> = {
  rules: "Rule",
  safety: "Safety rule",
  ai: "AI",
  operations: "Operations",
};

export function decidedByLabel(value?: string | null): string {
  if (!value) return "—";
  return DECIDED_BY[value] || value.replace(/_/g, " ");
}

const EVENT_LABELS: Record<string, string> = {
  email_delivered: "Email delivered",
  sms_delivered: "SMS delivered",
  email_opened: "Email opened",
  email_clicked: "Link clicked",
  payment_link_clicked: "Payment link clicked",
  payment_page_opened: "Payment page opened",
  payment_started: "Payment started",
  payment_abandoned: "Left the payment page",
  payment_failed: "Payment failed",
  payment_partial: "Part paid",
  payment_completed: "Paid",
  plan_created: "Payment plan set up",
  plan_instalment_missed: "Plan instalment missed",
  email_bounced: "Email bounced",
  email_unsubscribed: "Unsubscribed from email",
  email_from_failover: "Email sender changed",
  sms_failed: "SMS failed",
  sms_opted_out: "Opted out of SMS",
  email_not_opened: "Not opened in time",
  opened_not_clicked: "Opened, not clicked in time",
  clicked_not_paid: "Payment not finished in time",
  no_activity: "No activity",
  plan_setup_not_finished: "Plan setup not finished",
  reassess_requested: "Reassess Plan pressed",
};

const OPTION_LABELS: Record<string, string> = {
  pay_in_full: "pay in full",
  partial: "partial",
  payment_plan: "payment plan",
};

export function eventLabel(event: PayflowAdaptiveEvent): { text: string; muted: boolean } {
  const type = event.type || "";
  const detail = event.detail || {};
  if (type === "email_opened" && detail.machine_open === true) {
    return { text: "Opened (mail app)", muted: true };
  }
  let text = EVENT_LABELS[type] || (type ? type.replace(/_/g, " ") : "Activity");
  if (type === "payment_started" && typeof detail.option_type === "string") {
    text = `${text} · ${OPTION_LABELS[detail.option_type] || detail.option_type.replace(/_/g, " ")}`;
  }
  if (type === "email_from_failover" && typeof detail.active_email === "string" && detail.active_email) {
    text = `${text} · ${detail.active_email}`;
  }
  return { text, muted: false };
}

export function channelPreferenceLabel(channel?: string | null): string {
  if (channel === "SMS" || channel === "Email") return `${channel} is tried first from now on`;
  return "Usual order: email when possible";
}

export function nextActionSummary(snapshot: PayflowAdaptiveSnapshot): {
  title: string;
  when?: string | null;
} {
  const message = snapshot.next_message;
  if (message?.step_id || message?.title) {
    const lined = (snapshot.lined_up || []).find(
      (row) => row.replace_step_id && row.replace_step_id === message.step_id,
    );
    if (lined?.follow_up_title) {
      return {
        title: `${lined.follow_up_title}, in place of ${lined.replace_title || "the planned message"}`,
        when: message.not_before,
      };
    }
    return { title: message.title || "Next message", when: message.not_before };
  }
  if (snapshot.next_scheduled?.title || snapshot.next_scheduled?.step_id) {
    return {
      title: snapshot.next_scheduled.title || snapshot.next_scheduled.step_id || "Next check",
      when: snapshot.next_scheduled.at,
    };
  }
  return { title: "No message planned" };
}

export function primaryDecision(decisions?: PayflowAdaptiveDecision[] | null): {
  decision: PayflowAdaptiveDecision;
  mode: "waiting" | "last";
} | null {
  const rows = decisions || [];
  const waiting = rows.find((row) => row.status === "awaiting_approval");
  if (waiting) return { decision: waiting, mode: "waiting" };
  const last = rows.find((row) => row.action !== "keep_plan");
  if (last) return { decision: last, mode: "last" };
  return null;
}

export function levelName(
  types: PayflowAdaptiveFollowUpType[],
  followUpFor?: string | null,
  level?: number | null,
): string {
  const match = types.find((item) => item.follow_up_for === followUpFor);
  const found = match?.levels?.find((row) => row.level === (level ?? 1));
  if (found?.name) return found.name;
  const shared = new Set(
    types.flatMap((item) =>
      (item.levels || []).filter((row) => row.level === (level ?? 1) && row.name).map((row) => row.name),
    ),
  );
  if (shared.size === 1) return [...shared][0]!;
  if ((level ?? 1) === 2) return "Repeat";
  if ((level ?? 1) === 1) return "First Time";
  return `Level ${level ?? 1}`;
}

export function typeLabel(
  types: PayflowAdaptiveFollowUpType[],
  followUpFor?: string | null,
  fallback?: string | null,
): string {
  const match = types.find((item) => item.follow_up_for === followUpFor);
  if (match?.label) return match.label;
  if (fallback?.trim()) return fallback;
  if (!followUpFor) return "Follow-up";
  return followUpFor.replace(/_/g, " ");
}

export function switchChannelSummary(
  decision: PayflowAdaptiveDecision,
  preferredChannel?: string | null,
): string {
  const next = decision.channel || "—";
  if (decision.status === "awaiting_approval") {
    const previous = preferredChannel || "Email";
    return `${previous} → ${next}, from now on`;
  }
  return `${next}, from now on`;
}

export function decisionDetailLines(
  decision: PayflowAdaptiveDecision,
  preferredChannel?: string | null,
  levelLabel?: string | null,
): string[] {
  const lines: string[] = [];
  if (decision.action === "use_follow_up") {
    const place = `${decision.follow_up_title || "Follow-up"}, in place of ${decision.replace_title || "the planned message"}`;
    lines.push(levelLabel ? `${place} · ${levelLabel}` : place);
    if (decision.at) lines.push(formatAdaptiveStamp(decision.at));
  } else if (decision.action === "drop_follow_up") {
    lines.push(
      `${decision.follow_up_title || "Follow-up"} cancelled — ${decision.replace_title || "the planned message"} goes as planned`,
    );
  } else if (decision.action === "move_next" || decision.action === "recheck_at") {
    lines.push(decision.at ? formatAdaptiveStamp(decision.at) : "Time not set");
  } else if (decision.action === "switch_channel") {
    lines.push(switchChannelSummary(decision, preferredChannel));
  } else if (decision.action === "stop") {
    lines.push("Paid in full / nothing owed");
  }
  return lines;
}

export type AdaptiveTimelineEntry =
  | { kind: "event"; at: string; text: string; muted: boolean }
  | { kind: "decision"; at: string; decision: PayflowAdaptiveDecision }
  | { kind: "message"; at: string; message: PayflowAdaptiveMessage };

export function adaptiveTimeline(snapshot: PayflowAdaptiveSnapshot): AdaptiveTimelineEntry[] {
  const entries: AdaptiveTimelineEntry[] = [];
  for (const event of snapshot.events || []) {
    if (!event.at) continue;
    const label = eventLabel(event);
    entries.push({ kind: "event", at: event.at, text: label.text, muted: label.muted });
  }
  for (const decision of snapshot.decisions || []) {
    if (!decision.created_at) continue;
    entries.push({ kind: "decision", at: decision.created_at, decision });
  }
  for (const message of snapshot.messages || []) {
    if (!message.sent_at) continue;
    entries.push({ kind: "message", at: message.sent_at, message });
  }
  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function messageDidNotArrive(status?: string | null): boolean {
  const value = (status || "").toLowerCase();
  return value === "failed" || value === "cancelled" || value === "canceled" || value === "suppressed";
}

export function usageGroups(rows: PayflowAdaptiveFollowUpUsage[]): PayflowAdaptiveFollowUpUsage[][] {
  const order: string[] = [];
  const groups = new Map<string, PayflowAdaptiveFollowUpUsage[]>();
  for (const row of rows) {
    const key = row.follow_up_for || row.step_id;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(row);
  }
  return order.map((key) =>
    (groups.get(key) || []).slice().sort((a, b) => (a.level || 0) - (b.level || 0)),
  );
}

export function groupExhausted(
  rows: PayflowAdaptiveFollowUpUsage[],
  types: PayflowAdaptiveFollowUpType[] = [],
): boolean {
  if (!rows.length || rows.some((row) => row.state !== "sent")) return false;
  const expected = types.find((item) => item.follow_up_for === rows[0]?.follow_up_for)?.levels?.length;
  if (expected && rows.length < expected) return false;
  return true;
}

const ENDED_RUN = /^(completed|complete|cancelled|canceled|failed|stopped|ended|inactive)$/i;

export function workflowRunEnded(status?: string | null): boolean {
  return !!status && ENDED_RUN.test(status.trim());
}

export function localDateTimeToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isNoFollowUpToWrite(detail: string): boolean {
  return /no follow-up to write/i.test(detail);
}
