import type { Tone } from "../components/payflow/lovable/payflow-ui";
import type { PayflowStrategy, PayflowStrategyStep, PayflowStrategyStepConfig } from "../types";

export const STRATEGY_STATUSES = [
  "AI Proposed",
  "Draft",
  "Under Review",
  "Approved",
  "Active",
  "Inactive",
] as const;

export const CHANNELS = ["Email", "SMS"];
export const MESSAGE_PURPOSES = [
  "Payment Reminder",
  "Firm Reminder",
  "Payment Link",
  "Promise-to-Pay Reminder",
  "Payment Plan Reminder",
  "Contact Details Update Request",
];
export const REFERENCE_EVENTS = [
  "Case Received",
  "Due Date",
  "Previous Action",
  "Previous Email",
  "Previous SMS",
  "Payment Link Sent",
  "Promise-to-Pay Date",
  "Broken Promise-to-Pay",
  "Last Customer Response",
];
export const TIME_UNITS = ["Hours", "Days", "Weeks"];
export const TIME_DIRECTIONS = ["After", "Before"];
export const CONDITION_ATTRIBUTES = [
  "Payment Status",
  "Email Delivery",
  "SMS Delivery",
  "Email Address",
  "Mobile Number",
  "Payment Link",
  "Promise-to-Pay",
  "Customer Response",
  "Outstanding Balance",
];
export const CONDITION_OPERATORS = ["Equals", "Not Equals", "Greater Than", "Less Than"];
export const CONDITION_VALUES: Record<string, string[]> = {
  "Payment Status": ["Unpaid", "Paid In Full", "Partial Payment", "Payment Plan Active"],
  "Email Delivery": ["Delivered", "Failed", "Bounced"],
  "SMS Delivery": ["Delivered", "Failed"],
  "Email Address": ["Valid", "Invalid", "Missing"],
  "Mobile Number": ["Valid", "Invalid", "Missing"],
  "Payment Link": ["Clicked", "Not Clicked"],
  "Promise-to-Pay": ["Created", "Kept", "Broken", "None"],
  "Customer Response": ["Received", "None", "Dispute Raised"],
  "Outstanding Balance": ["1,000", "5,000", "10,000"],
};
export const CASE_ACTIONS = [
  "Move Case To Escalated Treatment",
  "Hold Automated Contact",
  "Request Contact Details Update",
  "Close Case",
];
export const PAYMENT_ACTIONS = [
  "Send Secure Payment Link",
  "Offer Payment Plan",
  "Record Promise To Pay",
];
export const OUTCOMES = [
  "Paid In Full",
  "Payment Plan Active",
  "Promise To Pay Recorded",
  "No Contactable Channel",
  "Case Closed",
];

/** Lovable Human Review reason catalog — separate from Triggered Rule name. */
export const REVIEW_REASONS = [
  "Repeated unsuccessful attempts",
  "Low decision confidence",
  "Payment arrangement exception",
  "High balance treatment",
  "Customer dispute raised",
  "Hardship signal detected",
];

export type DraftStepKind =
  | "Communication"
  | "Wait"
  | "Condition"
  | "AI Reassessment"
  | "Case Action"
  | "Human Review"
  | "Payment Action";

export type DraftStep = {
  id: string;
  kind: DraftStepKind;
  channel?: string;
  purpose?: string;
  amount: number;
  unit: string;
  referenceEvent?: string;
  action?: string;
  note?: string;
};

export function strategyStatusTone(status: string): Tone {
  switch (status) {
    case "AI Proposed":
      return "ai";
    case "Under Review":
      return "warning";
    case "Draft":
      return "neutral";
    case "Approved":
      return "info";
    case "Active":
      return "success";
    case "Inactive":
      return "neutral";
    default:
      return "neutral";
  }
}

export function stepTone(kind: string): Tone {
  switch (kind) {
    case "Communication":
      return "info";
    case "Condition":
      return "warning";
    case "AI Reassessment":
      return "ai";
    case "Human Review":
      return "danger";
    case "Outcome":
    case "Payment Action":
      return "success";
    default:
      return "neutral";
  }
}

export function stepConfig(step: PayflowStrategyStep): PayflowStrategyStepConfig {
  return step.config || {};
}

export function timingLabel(step: PayflowStrategyStep): string | undefined {
  if (step.timing) return step.timing;
  const cfg = stepConfig(step);
  const reference = cfg.reference_event;
  if (!reference) return undefined;
  const amount = cfg.amount ?? 0;
  const unit = cfg.unit || "Days";
  const direction = cfg.direction || "After";
  if (!amount) return `Immediately when ${reference.toLowerCase()} occurs`;
  const unitLabel = amount === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit;
  return `${amount} ${unitLabel} ${direction} ${reference}`;
}

export function conditionLabel(step: PayflowStrategyStep): string | undefined {
  const cfg = stepConfig(step);
  if (!cfg.attribute) return undefined;
  return `${cfg.attribute} ${(cfg.operator || "Equals").toLowerCase()} ${cfg.value || ""}`.trim();
}

/** Index steps by id for graph traversal (canvas / minimap). */
export function stepsById(strategy: PayflowStrategy): Record<string, PayflowStrategyStep> {
  const map: Record<string, PayflowStrategyStep> = {};
  (strategy.steps || []).forEach((step, i) => {
    const id = step.id || `s${i + 1}`;
    map[id] = { ...step, id };
  });
  return map;
}

export function entryNodeId(strategy: PayflowStrategy): string | null {
  if (strategy.entry_node_id) return strategy.entry_node_id;
  const first = strategy.steps?.[0];
  return first?.id || (first ? "s1" : null);
}

/** If BE returns a flat list without next links, synthesize a linear chain for preview. */
export function ensureStepLinks(strategy: PayflowStrategy): PayflowStrategy {
  const steps = (strategy.steps || []).map((s, i) => ({
    ...s,
    id: s.id || `s${i + 1}`,
  }));
  const hasLinks = steps.some((s) => s.next || s.yes || s.no);
  if (hasLinks || steps.length === 0) {
    return { ...strategy, steps, entry_node_id: strategy.entry_node_id || steps[0]?.id || null };
  }
  const linked = steps.map((s, i) => {
    if (s.kind === "Condition") {
      return {
        ...s,
        next: null,
        yes: s.yes || null,
        no: s.no || steps[i + 1]?.id || null,
      };
    }
    return { ...s, next: s.next ?? steps[i + 1]?.id ?? null };
  });
  return {
    ...strategy,
    steps: linked,
    entry_node_id: strategy.entry_node_id || linked[0]?.id || null,
  };
}

let seq = 0;
export function uid() {
  seq += 1;
  return `s${seq}-${Date.now().toString(36)}`;
}

export function makeDraftStep(kind: DraftStepKind): DraftStep {
  if (kind === "Communication") {
    return {
      id: uid(),
      kind,
      channel: "Email",
      purpose: MESSAGE_PURPOSES[0],
      amount: 0,
      unit: "Days",
      referenceEvent: "Previous Action",
    };
  }
  if (kind === "Payment Action") {
    return {
      id: uid(),
      kind,
      amount: 0,
      unit: "Days",
      action: PAYMENT_ACTIONS[0],
      referenceEvent: "Previous Action",
    };
  }
  if (kind === "Case Action") {
    return {
      id: uid(),
      kind,
      amount: 0,
      unit: "Days",
      action: CASE_ACTIONS[0],
      referenceEvent: "Previous Action",
    };
  }
  if (kind === "Human Review") {
    return {
      id: uid(),
      kind,
      amount: 0,
      unit: "Days",
      note: "Supervisor review required before continuing",
      referenceEvent: "Previous Action",
    };
  }
  return {
    id: uid(),
    kind,
    amount: kind === "Wait" ? 3 : 0,
    unit: "Days",
    referenceEvent: "Previous Action",
  };
}

export function draftStepTitle(step: DraftStep): string {
  switch (step.kind) {
    case "Communication":
      return `Send ${step.channel || "Email"} — ${step.purpose || MESSAGE_PURPOSES[0]}`;
    case "Wait":
      return "Wait / observe";
    case "Condition":
      return "Payment received?";
    case "AI Reassessment":
      return "AI reassessment";
    case "Case Action":
      return step.action || "Case action";
    case "Payment Action":
      return step.action || "Payment action";
    case "Human Review":
      return "Human review";
    default:
      return step.kind;
  }
}

/** Turn ordered draft steps into a linked BE step graph (Trigger + YES/NO for conditions). */
export function buildStepsFromDraft(steps: DraftStep[]): PayflowStrategyStep[] {
  const triggerId = "t1";
  const result: PayflowStrategyStep[] = [
    {
      id: triggerId,
      kind: "Trigger",
      title: "Case enters this workflow",
      origin: "Human Created",
      config: {
        reference_event: "Case Received",
        amount: 0,
        unit: "Days",
        direction: "After",
      },
      next: steps[0]?.id ?? null,
    },
  ];

  steps.forEach((step, i) => {
    const nextId = steps[i + 1]?.id ?? null;
    if (step.kind === "Condition") {
      const outcomeId = `${step.id}-paid`;
      result.push({
        id: outcomeId,
        kind: "Outcome",
        title: "Case closed — paid",
        origin: "Human Created",
        config: { outcome: "Paid In Full" },
        next: null,
      });
      result.push({
        id: step.id,
        kind: "Condition",
        title: draftStepTitle(step),
        origin: "Human Created",
        config: {
          attribute: "Payment Status",
          operator: "Equals",
          value: "Paid In Full",
        },
        next: null,
        yes: outcomeId,
        no: nextId,
      });
      return;
    }
    const config: PayflowStrategyStepConfig = {
      reference_event: step.referenceEvent || "Previous Action",
      amount: step.amount,
      unit: step.unit || "Days",
      direction: "After",
    };
    if (step.kind === "Communication") {
      config.channel = step.channel || "Email";
      config.purpose = step.purpose || MESSAGE_PURPOSES[0];
    }
    if (step.kind === "Payment Action" || step.kind === "Case Action") {
      config.action = step.action;
    }
    if (step.kind === "Human Review") {
      config.note = step.note;
      config.review_reason = REVIEW_REASONS[2]; // Payment arrangement exception
    }
    result.push({
      id: step.id,
      kind: step.kind,
      title: draftStepTitle(step),
      origin: "Human Created",
      config,
      channel: config.channel,
      purpose: config.purpose,
      next: nextId,
    });
  });

  return result;
}

/** Attach the best catalog template id for each Communication step (channel + purpose). */
export function assignDraftTemplates(
  steps: PayflowStrategyStep[],
  templates: { id: string; channel: string; purpose: string }[],
): PayflowStrategyStep[] {
  if (!templates.length) return steps;
  return steps.map((step) => {
    if (step.kind !== "Communication") return step;
    const cfg = step.config || {};
    const exact = templates.filter(
      (t) => t.channel === (cfg.channel || "") && t.purpose === (cfg.purpose || ""),
    );
    const pick = exact[0] || templates.find((t) => t.channel === cfg.channel) || templates[0];
    if (!pick) return step;
    return { ...step, config: { ...cfg, template_id: pick.id } };
  });
}

/** Lovable-style tip list for the Ask PayFlow AI panel. */
export function aiSuggestionsForSegment(segment: {
  balance_band?: string;
  delinquency?: string;
  language?: string;
  age_band?: string;
}): string[] {
  const tips: string[] = [];
  tips.push(
    segment.balance_band === "$5,000 and over"
      ? "Larger balances respond better to a payment plan offer early in the flow."
      : "Start with the cheapest contactable channel and confirm delivery before adding contact.",
  );
  if (segment.delinquency === "90+ days past due") {
    tips.push("At 90+ days past due, confirm contactability first — reach is the main constraint.");
  }
  if (segment.language === "French" || segment.language === "English + French") {
    tips.push("Send in the customer's preferred language to lift response rates.");
  }
  if (segment.age_band === "18 – 24" || segment.age_band === "25 – 34") {
    tips.push("Younger age bands engage more with SMS payment links than with email.");
  }
  if (segment.age_band === "65 and over") {
    tips.push("Allow longer observation windows between contacts for this age band.");
  }
  tips.push("Add a supervisor review step before any escalated treatment.");
  return tips;
}

/** Deterministic local "AI" suggestions — stays on the create screen (lovable behaviour). */
export function suggestFromPrompt(
  prompt: string,
  segment?: { delinquency?: string; balance_band?: string },
): DraftStep[] {
  const p = prompt.toLowerCase();
  const gentle = /gentle|soft|early|gradual|remind/.test(p);
  const urgent = /urgent|fast|aggressive|escalat|final|late|overdue/.test(p);
  const smsFirst = /sms|text|mobile/.test(p);
  const wantsPlan = /plan|installment|instalment|arrangement|afford/.test(p);
  const wantsReview = /review|supervisor|approval|sensitive/.test(p);
  const lateSegment = (segment?.delinquency || "").includes("90");

  const first = makeDraftStep("Communication");
  first.channel = smsFirst ? "SMS" : "Email";
  first.purpose = MESSAGE_PURPOSES[0];
  first.amount = urgent ? 0 : 1;
  first.referenceEvent = "Previous Action";

  const wait = makeDraftStep("Wait");
  wait.amount = urgent ? 2 : gentle ? 5 : 3;
  wait.referenceEvent = "Previous Action";

  const check = makeDraftStep("Condition");

  const second = makeDraftStep("Communication");
  second.channel = smsFirst ? "Email" : "SMS";
  second.purpose = wantsPlan
    ? MESSAGE_PURPOSES.find((m) => /plan|arrangement/i.test(m)) || MESSAGE_PURPOSES[0]!
    : MESSAGE_PURPOSES[1] || MESSAGE_PURPOSES[0]!;
  second.amount = urgent ? 1 : 3;
  second.referenceEvent = "Previous Action";

  const steps: DraftStep[] = [first, wait, check, second, makeDraftStep("AI Reassessment")];
  if (lateSegment || urgent) {
    const finalNotice = makeDraftStep("Communication");
    finalNotice.channel = "Email";
    finalNotice.purpose =
      MESSAGE_PURPOSES.find((m) => /final|firm|notice/i.test(m)) || MESSAGE_PURPOSES[0]!;
    finalNotice.amount = 5;
    finalNotice.referenceEvent = "Previous Action";
    steps.push(finalNotice);
  }
  if (wantsReview) steps.push(makeDraftStep("Human Review"));
  return steps;
}

export function segmentChips(segment: Record<string, string> | undefined | null): string[] {
  return Object.entries(segment || {})
    .filter(([, v]) => !!v)
    .map(([k, v]) => {
      const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return `${label}: ${v}`;
    });
}

export function originTone(origin: string): Tone {
  if (origin === "AI Proposed") return "ai";
  if (origin === "Human Modified") return "info";
  return "neutral";
}

export type AddableStepKind =
  | "Communication"
  | "Wait"
  | "Condition"
  | "AI Reassessment"
  | "Case Action"
  | "Payment Action"
  | "Human Review";

export const ADDABLE_STEP_KINDS: AddableStepKind[] = [
  "Communication",
  "Wait",
  "Condition",
  "AI Reassessment",
  "Case Action",
  "Payment Action",
  "Human Review",
];

function cloneSteps(steps: PayflowStrategyStep[]): PayflowStrategyStep[] {
  return steps.map((s, i) => ({
    ...s,
    id: s.id || `s${i + 1}`,
    config: { ...(s.config || {}) },
  }));
}

function defaultStepForKind(kind: AddableStepKind): PayflowStrategyStep {
  const id = uid();
  if (kind === "Communication") {
    return {
      id,
      kind,
      title: `Send Email — ${MESSAGE_PURPOSES[0]}`,
      origin: "Human Modified",
      config: {
        channel: "Email",
        purpose: MESSAGE_PURPOSES[0],
        reference_event: "Previous Action",
        amount: 2,
        unit: "Days",
        direction: "After",
      },
      channel: "Email",
      purpose: MESSAGE_PURPOSES[0],
      next: null,
    };
  }
  if (kind === "Condition") {
    return {
      id,
      kind,
      title: "Payment received?",
      origin: "Human Modified",
      config: {
        attribute: "Payment Status",
        operator: "Equals",
        value: "Paid In Full",
      },
      next: null,
      yes: null,
      no: null,
    };
  }
  if (kind === "Payment Action") {
    return {
      id,
      kind,
      title: PAYMENT_ACTIONS[0]!,
      origin: "Human Modified",
      config: {
        action: PAYMENT_ACTIONS[0],
        reference_event: "Previous Action",
        amount: 0,
        unit: "Days",
        direction: "After",
      },
      next: null,
    };
  }
  if (kind === "Case Action") {
    return {
      id,
      kind,
      title: CASE_ACTIONS[0]!,
      origin: "Human Modified",
      config: {
        action: CASE_ACTIONS[0],
        reference_event: "Previous Action",
        amount: 0,
        unit: "Days",
        direction: "After",
      },
      next: null,
    };
  }
  if (kind === "Human Review") {
    return {
      id,
      kind,
      title: "Human review",
      origin: "Human Modified",
      config: {
        note: "Supervisor review required before continuing",
        review_reason: REVIEW_REASONS[2], // Payment arrangement exception
        reference_event: "Previous Action",
        amount: 0,
        unit: "Days",
        direction: "After",
      },
      next: null,
    };
  }
  if (kind === "AI Reassessment") {
    return {
      id,
      kind,
      title: "AI reassessment",
      origin: "Human Modified",
      config: {
        note: "Reassess treatment with latest case context",
        reference_event: "Previous Action",
        amount: 0,
        unit: "Days",
        direction: "After",
      },
      next: null,
    };
  }
  return {
    id,
    kind: "Wait",
    title: "Wait / observe",
    origin: "Human Modified",
    config: {
      reference_event: "Previous Action",
      amount: 3,
      unit: "Days",
      direction: "After",
    },
    next: null,
  };
}

/** Insert a new step after `afterId`, rewiring next/yes/no links. */
export function addStepAfter(
  steps: PayflowStrategyStep[],
  afterId: string,
  kind: AddableStepKind,
): PayflowStrategyStep[] {
  const list = cloneSteps(steps);
  const after = list.find((s) => s.id === afterId);
  if (!after || after.kind === "Condition") return list;

  const created = defaultStepForKind(kind);
  const previousNext = after.next ?? null;

  if (kind === "Condition") {
    const outcomeId = `${created.id}-yes`;
    const outcome: PayflowStrategyStep = {
      id: outcomeId,
      kind: "Outcome",
      title: "Case closed — paid",
      origin: "Human Modified",
      config: { outcome: "Paid In Full" },
      next: null,
    };
    created.yes = outcomeId;
    created.no = previousNext;
    created.next = null;
    after.next = created.id!;
    return [...list, created, outcome];
  }

  created.next = previousNext;
  after.next = created.id!;
  return [...list, created];
}

/** Remove a step and rewire predecessors to its next (or NO branch for conditions). */
export function removeStep(
  steps: PayflowStrategyStep[],
  stepId: string,
): PayflowStrategyStep[] {
  const list = cloneSteps(steps);
  const target = list.find((s) => s.id === stepId);
  if (!target || target.kind === "Trigger") return list;

  const fallback =
    target.kind === "Condition" ? target.no ?? target.yes ?? null : target.next ?? null;
  const removeIds = new Set<string>([stepId]);
  if (target.kind === "Condition" && target.yes) {
    const yesNode = list.find((s) => s.id === target.yes);
    if (yesNode?.kind === "Outcome" && !yesNode.next) removeIds.add(target.yes);
  }

  return list
    .filter((s) => !removeIds.has(s.id!))
    .map((s) => {
      const next = s.next === stepId ? fallback : s.next;
      const yes = s.yes === stepId ? fallback : s.yes;
      const no = s.no === stepId ? fallback : s.no;
      return { ...s, next, yes, no };
    });
}

export function templatesForChannelPurpose(
  templates: { id: string; name: string; channel: string; purpose: string; subject?: string | null; body?: string | null }[],
  channel?: string | null,
  purpose?: string | null,
) {
  return templates.filter(
    (t) =>
      (!channel || t.channel === channel) && (!purpose || t.purpose === purpose),
  );
}

export function templateById(
  templates: { id: string; name: string; channel: string; purpose: string; subject?: string | null; body?: string | null }[],
  templateId?: string | null,
) {
  if (!templateId) return undefined;
  return templates.find((t) => t.id === templateId);
}

/** Statuses where POST /workflows/{id}/content is allowed. */
export const WORKFLOW_MESSAGE_EDIT_STATUSES = [
  "Draft",
  "AI Proposed",
  "Under Review",
] as const;

export function canWriteWorkflowMessages(status?: string | null) {
  return !!status && (WORKFLOW_MESSAGE_EDIT_STATUSES as readonly string[]).includes(status);
}

/** Sample values for {{…}} preview (matches BE docs). */
export const MESSAGE_PREVIEW_SAMPLES: Record<string, string> = {
  first_name: "Alexandra",
  outstanding_balance: "$1,250.00",
  account_reference: "ACC-1002456",
  payment_link: "https://pay.example.com/pay/demo",
  brand_name: "Maple Energy",
  promise_amount: "$300.00",
  promise_date: "2026-11-15",
};

export function renderMessagePreview(text?: string | null) {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return MESSAGE_PREVIEW_SAMPLES[key] ?? `{{${key}}}`;
  });
}

/** Prefer AI/reviewer body snippet; fall back to catalog template. */
export function communicationSnippet(
  step: PayflowStrategyStep,
  templates: { id: string; name: string; channel: string; purpose: string; subject?: string | null; body?: string | null }[],
  maxLen = 120,
) {
  const cfg = stepConfig(step);
  const own = (cfg.body || "").trim();
  if (own) return own.slice(0, maxLen);
  const tpl = templateById(templates, cfg.template_id);
  if (!tpl?.body) return null;
  return tpl.body.slice(0, maxLen);
}

export function messagesNotWrittenContext(
  aiContext?: { label: string; value: string }[] | null,
) {
  return (aiContext || []).find(
    (item) =>
      item.label === "Messages" &&
      /not written/i.test(item.value || ""),
  );
}
