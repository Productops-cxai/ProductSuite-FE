import type {
  PayflowClientDetail,
  PayflowOnboardingProgress,
  PayflowOnboardingStep,
} from "../types";

export type SetupCheck = {
  label: string;
  done: boolean;
  detail: string;
  required: boolean;
};

export type OnboardingStage = {
  key: string;
  label: string;
  done: boolean;
  blocked: boolean;
  pending: boolean;
  informational?: boolean;
  /** Config section or special target */
  target?:
    | "General"
    | "Data Source"
    | "Branding & Channels"
    | "AI & Governance"
    | "Supervisors"
    | "portfolios"
    | "activation";
};

/** Display labels aligned with incomplete-setup chips. */
export function setupDisplayLabel(label: string): string {
  const l = label.trim().toLowerCase();
  if (l === "general" || l === "profile" || l === "client profile") return "Client Profile";
  if (l === "supervisors" || l === "assigned users" || l.includes("supervisor"))
    return "Supervisor Assignment";
  if (l.includes("portfolio") || l.includes("sub-client")) return "Portfolios";
  if (l.includes("data source")) return "Data Source";
  if (l.includes("branding")) return "Branding & Channels";
  if (l.includes("ai") || l.includes("governance")) return "AI Mode & Governance";
  return label;
}

/** Hidden from client journey — mapping is system-fixed under System Mapping. */
function isHiddenJourneyLabel(label: string): boolean {
  const l = label.trim().toLowerCase();
  return l.includes("data mapping") || l === "mapping";
}

/** Banner / clients-grid chips (excludes AI, activation, and Data Mapping). */
const BANNER_CHIP_KEYS = new Set([
  "profile",
  "portfolios",
  "data_source",
  "branding",
  "supervisors",
]);

/** Setup steps still incomplete — used by clients list + detail header chips. */
export function incompleteSetupSections(
  onboarding?: PayflowOnboardingProgress | null,
  setupIncomplete?: string[] | null,
): string[] {
  if (Array.isArray(setupIncomplete) && setupIncomplete.length > 0) {
    return setupIncomplete
      .filter((label) => !isHiddenJourneyLabel(label))
      .map(setupDisplayLabel);
  }
  if (!onboarding?.steps?.length) return [];
  return onboarding.steps
    .filter(
      (s) =>
        BANNER_CHIP_KEYS.has(s.key) &&
        (s.status || "").toLowerCase() !== "complete",
    )
    .map((s) => setupDisplayLabel(s.label));
}

/** Live incomplete chips for detail header / grid. */
export function missingSetupChips(detail: PayflowClientDetail): string[] {
  return buildOnboardingStages(detail)
    .filter((s) => BANNER_CHIP_KEYS.has(s.key) && !s.done)
    .map((s) => s.label);
}

export function isClientSettingUp(status?: string | null): boolean {
  const s = (status || "").toLowerCase();
  return s === "draft" || s === "onboarding";
}

export function stepIsComplete(step?: PayflowOnboardingStep | null): boolean {
  return (step?.status || "").toLowerCase() === "complete";
}

export function stepIsBlocked(step?: PayflowOnboardingStep | null): boolean {
  return (step?.status || "").toLowerCase() === "blocked";
}

/** Map onboarding / incomplete labels to config navigation targets. */
export function setupTargetForLabel(label: string): OnboardingStage["target"] {
  const l = label.toLowerCase();
  if (l.includes("profile") || l === "general") return "General";
  if (l.includes("portfolio") || l.includes("sub-client")) return "portfolios";
  if (l.includes("data source")) return "Data Source";
  if (l.includes("branding") || l.includes("channel")) return "Branding & Channels";
  if (l.includes("ai") || l.includes("governance")) return "AI & Governance";
  if (l.includes("supervisor") || l.includes("assigned user")) return "Supervisors";
  if (l.includes("activation") || l.includes("review")) return "activation";
  return "General";
}

export function buildActivationChecks(detail: PayflowClientDetail): SetupCheck[] {
  const channels = [
    detail.channels?.email && "Email",
    detail.channels?.sms && "SMS",
  ].filter(Boolean) as string[];
  const supervisorCount = (detail.supervisors || []).length;
  const portfolioCount = detail.portfolio_count ?? detail.portfolios?.length ?? 0;
  const govCount = (detail.governance_rules || []).length;
  const ds = (detail.data_source_type || "").toLowerCase();
  const conn = (detail.connection_status || "").toLowerCase();
  const sourceSelected = ds === "file" || ds === "crm";
  const sourceReady = ds === "file" || (ds === "crm" && conn === "connected");
  const brandingOk = stepIsComplete(
    detail.onboarding?.steps?.find((s) => s.key === "branding"),
  );
  const brandLabel =
    detail.client_type_label === "Third Party"
      ? detail.brand_name || detail.name || "PayFlow branded"
      : detail.brand_name || "Brand name missing";

  return [
    {
      label: "Client profile",
      done: stepIsComplete(detail.onboarding?.steps?.find((s) => s.key === "profile")),
      detail: detail.code || "Client code missing",
      required: true,
    },
    {
      label: "Data source selected",
      done: sourceSelected,
      detail: ds === "file" ? "Daily file" : ds === "crm" ? "CRM" : "Not selected",
      required: true,
    },
    {
      label: "Data source connected",
      done: sourceReady,
      detail:
        ds === "file"
          ? "Ready for file intake"
          : detail.connection_status_label || detail.connection_status || "Not Connected",
      required: true,
    },
    {
      label: "Branding configured",
      done: brandingOk,
      detail: brandLabel,
      required: true,
    },
    {
      label: "Channel enabled",
      done: channels.length > 0,
      detail: channels.join(", ") || "None",
      required: true,
    },
    {
      label: "Supervisor assigned",
      done: supervisorCount > 0,
      detail: `${supervisorCount} assigned`,
      required: true,
    },
    {
      label: "Sub-Client / Portfolio",
      done: portfolioCount > 0,
      detail: `${portfolioCount} configured`,
      required: false,
    },
    {
      label: "Client governance rules",
      done: govCount > 0,
      detail: govCount ? `${govCount} applied` : "System rules apply",
      required: false,
    },
  ];
}

/** Client onboarding stepper — Data Mapping omitted (system-fixed). */
export function buildOnboardingStages(detail: PayflowClientDetail): OnboardingStage[] {
  const steps = detail.onboarding?.steps || [];
  const byKey = (key: string) => steps.find((s) => s.key === key);
  const checks = buildActivationChecks(detail);
  const requiredReady = checks.filter((c) => c.required).every((c) => c.done);
  const sourceSelected = checks.find((c) => c.label === "Data source selected")?.done ?? false;
  const sourceReady = checks.find((c) => c.label === "Data source connected")?.done ?? false;
  const portfolioCount = detail.portfolio_count ?? detail.portfolios?.length ?? 0;

  const profileDone = byKey("profile")
    ? stepIsComplete(byKey("profile"))
    : Boolean(detail.name && detail.code);
  const brandingDone = byKey("branding")
    ? stepIsComplete(byKey("branding"))
    : false;
  const supervisorsDone = byKey("supervisors")
    ? stepIsComplete(byKey("supervisors"))
    : (detail.supervisors || []).length > 0;

  return [
    {
      key: "profile",
      label: "Client Profile",
      done: profileDone,
      blocked: false,
      pending: !profileDone,
      target: "General",
    },
    {
      key: "portfolios",
      label: "Portfolios",
      done: portfolioCount > 0,
      blocked: false,
      pending: portfolioCount === 0,
      informational: true,
      target: "portfolios",
    },
    {
      key: "data_source",
      label: "Data Source",
      done: sourceSelected && sourceReady,
      blocked: false,
      pending: !(sourceSelected && sourceReady),
      target: "Data Source",
    },
    {
      key: "branding",
      label: "Branding & Channels",
      done: brandingDone,
      blocked: false,
      pending: !brandingDone,
      target: "Branding & Channels",
    },
    {
      key: "ai_governance",
      label: "AI Mode & Governance",
      done: stepIsComplete(byKey("ai_governance")) || Boolean(detail.ai_mode),
      blocked: false,
      pending: !(stepIsComplete(byKey("ai_governance")) || Boolean(detail.ai_mode)),
      target: "AI & Governance",
    },
    {
      key: "supervisors",
      label: "Supervisor Assignment",
      done: supervisorsDone,
      blocked: false,
      pending: !supervisorsDone,
      target: "Supervisors",
    },
    {
      key: "activation",
      label: "Review & Activation",
      done: (detail.status || "").toLowerCase() === "active",
      blocked: !requiredReady,
      pending: requiredReady && (detail.status || "").toLowerCase() !== "active",
      target: "activation",
    },
  ];
}

/** Sidebar hint for config sections. */
export function configSectionHint(
  section: string,
  detail: PayflowClientDetail,
): "Done" | "Needs attention" | null {
  const stages = buildOnboardingStages(detail);
  const map: Record<string, string> = {
    General: "profile",
    "Data Source": "data_source",
    "Branding & Channels": "branding",
    "AI & Governance": "ai_governance",
    Supervisors: "supervisors",
    "Assigned Users": "supervisors",
  };
  const key = map[section];
  if (!key) return null;
  const st = stages.find((s) => s.key === key);
  if (!st) return null;
  if (st.done) return "Done";
  return "Needs attention";
}
