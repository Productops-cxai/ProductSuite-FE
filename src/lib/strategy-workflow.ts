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

export function suggestFromPrompt(prompt: string): DraftStep[] {
  const p = prompt.toLowerCase();
  const gentle = /gentle|soft|early|gradual|remind/.test(p);
  const urgent = /urgent|fast|aggressive|escalat|final|late|overdue/.test(p);
  const smsFirst = /sms|text|mobile/.test(p);
  const wantsPlan = /plan|installment|instalment|arrangement|afford/.test(p);
  const wantsReview = /review|supervisor|approval|sensitive/.test(p);

  const first = makeDraftStep("Communication");
  first.channel = smsFirst ? "SMS" : "Email";
  first.purpose = MESSAGE_PURPOSES[0];
  first.amount = urgent ? 0 : 1;
  first.referenceEvent = "Case Received";

  const wait = makeDraftStep("Wait");
  wait.amount = urgent ? 2 : gentle ? 5 : 3;
  wait.referenceEvent = smsFirst ? "Previous SMS" : "Previous Email";

  const check = makeDraftStep("Condition");

  const second = makeDraftStep("Communication");
  second.channel = smsFirst ? "Email" : "SMS";
  second.purpose = wantsPlan ? "Payment Plan Reminder" : "Promise-to-Pay Reminder";
  second.amount = urgent ? 1 : 3;
  second.referenceEvent = "Previous Action";

  const steps: DraftStep[] = [first, wait, check, second, makeDraftStep("AI Reassessment")];
  if (urgent) {
    const finalNotice = makeDraftStep("Communication");
    finalNotice.channel = "Email";
    finalNotice.purpose = "Firm Reminder";
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
