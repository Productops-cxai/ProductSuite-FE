import type {
  PayflowAudienceProfile,
  PayflowMessageBrief,
  PayflowMessageTranslation,
  PayflowMessageVersion,
  PayflowStrategy,
  PayflowStrategyStep,
  PayflowStrategyStepConfig,
  PayflowTextWarning,
  PayflowWorkflowAudience,
} from "../types";
import { displayChannel, isContactStep } from "./strategy-workflow";

/** Dropdown value for the step's main text. Sent as `audience: "main"` when regenerating. */
export const MAIN_AUDIENCE = "main";

export const SUBJECT_MAX = 255;
export const BODY_MAX = 5000;
export const SMS_BODY_MAX = 1000;

export type MessageChannelMode = "email_sms" | "email" | "sms";

export interface VersionOption {
  key: string;
  label: string;
}

export interface VisibleMessage {
  subject: string;
  emailBody: string;
  smsBody: string;
}

const PRIMARY_FALLBACK = "EN";

export function messageChannelMode(step: PayflowStrategyStep): MessageChannelMode {
  if (isContactStep(step)) return "email_sms";
  if (displayChannel(step) === "SMS") return "sms";
  return "email";
}

export function versionRecord(
  cfg: PayflowStrategyStepConfig | null | undefined,
): Record<string, PayflowMessageVersion> {
  const raw = cfg?.versions;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

/** Main / Default, then each version the step actually has, labelled from the payload. */
export function communicationVersionOptions(
  cfg: PayflowStrategyStepConfig | null | undefined,
): VersionOption[] {
  const extras = Object.entries(versionRecord(cfg))
    .filter(([, value]) => !!value && typeof value === "object")
    .map(([key, value]) => ({
      key,
      label: (value.label || "").trim() || key,
    }));
  return [{ key: MAIN_AUDIENCE, label: "Main / Default" }, ...extras];
}

export function versionOptionLabel(option: VersionOption, all: VersionOption[]): string {
  const duplicated = all.filter((item) => item.label === option.label).length > 1;
  return duplicated ? `${option.label} (${option.key})` : option.label;
}

export function primaryLanguageCode(strategy: PayflowStrategy): string {
  const raw = String(strategy.segment?.language || strategy.segment?.language_preference || "").trim();
  const code = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) return code;
  if (/english/i.test(raw)) return "EN";
  if (/french/i.test(raw)) return "FR";
  return PRIMARY_FALLBACK;
}

function translationEntries(
  translations?: Record<string, PayflowMessageTranslation> | null,
): [string, PayflowMessageTranslation][] {
  if (!translations || typeof translations !== "object" || Array.isArray(translations)) return [];
  return Object.entries(translations);
}

export function translationBag(
  translations: Record<string, PayflowMessageTranslation> | null | undefined,
  code: string,
): PayflowMessageTranslation | null {
  const found = translationEntries(translations).find(
    ([key]) => key.toUpperCase() === code.toUpperCase(),
  );
  return found ? found[1] || {} : null;
}

function translationStorageKey(
  translations: Record<string, PayflowMessageTranslation> | null | undefined,
  code: string,
): string {
  const found = translationEntries(translations).find(
    ([key]) => key.toUpperCase() === code.toUpperCase(),
  );
  return found ? found[0] : code.toUpperCase();
}

export function languageCodes(
  cfg: PayflowStrategyStepConfig | null | undefined,
  versionKey: string,
  primary: string,
): string[] {
  const source =
    versionKey === MAIN_AUDIENCE ? cfg : versionRecord(cfg)[versionKey];
  const extras = translationEntries(source?.translations)
    .map(([key]) => key.toUpperCase())
    .filter((key) => key !== primary.toUpperCase());
  return [primary.toUpperCase(), ...Array.from(new Set(extras))];
}

function messageSource(
  cfg: PayflowStrategyStepConfig,
  versionKey: string,
): PayflowMessageVersion | PayflowStrategyStepConfig {
  if (versionKey === MAIN_AUDIENCE) return cfg;
  return versionRecord(cfg)[versionKey] || {};
}

export function readVisibleMessage(
  cfg: PayflowStrategyStepConfig,
  versionKey: string,
  language: string,
  primary: string,
  mode: MessageChannelMode,
): VisibleMessage {
  const source = messageSource(cfg, versionKey);
  const bag =
    language.toUpperCase() === primary.toUpperCase()
      ? source
      : translationBag(source.translations, language) || {};
  const subject = bag.subject || "";
  const body = bag.body || "";
  const sms = mode === "sms" ? body : bag.sms_body || "";
  return {
    subject: mode === "sms" ? "" : subject,
    emailBody: mode === "sms" ? "" : body,
    smsBody: mode === "email" ? "" : sms,
  };
}

function clip(value: string, max: number): string | null {
  if (!value) return null;
  return value.slice(0, max);
}

function contentOriginAfterEdit(current?: string | null): Partial<PayflowStrategyStepConfig> {
  if (current === "AI Generated") return { content_origin: "AI Generated, Human Edited" };
  if (!current) return { content_origin: "Human Created" };
  return {};
}

export function patchVisibleMessage(
  cfg: PayflowStrategyStepConfig,
  ctx: {
    versionKey: string;
    language: string;
    primary: string;
    mode: MessageChannelMode;
  },
  changes: { subject?: string; email?: string; sms?: string },
): Partial<PayflowStrategyStepConfig> {
  const primaryEdit = ctx.language.toUpperCase() === ctx.primary.toUpperCase();
  const apply = (target: PayflowMessageTranslation) => {
    if (changes.subject !== undefined && ctx.mode !== "sms") {
      target.subject = clip(changes.subject, SUBJECT_MAX);
    }
    if (changes.email !== undefined && ctx.mode !== "sms") {
      target.body = clip(changes.email, BODY_MAX);
    }
    if (changes.sms !== undefined && ctx.mode !== "email") {
      const sms = clip(changes.sms, SMS_BODY_MAX);
      if (ctx.mode === "sms") target.body = sms;
      else target.sms_body = sms;
    }
  };

  if (ctx.versionKey === MAIN_AUDIENCE) {
    if (primaryEdit) {
      const next: PayflowMessageTranslation = {
        subject: cfg.subject ?? null,
        body: cfg.body ?? null,
        sms_body: cfg.sms_body ?? null,
      };
      apply(next);
      const patch: Partial<PayflowStrategyStepConfig> = { ...contentOriginAfterEdit(cfg.content_origin) };
      if (ctx.mode !== "sms") {
        patch.subject = next.subject ?? null;
        patch.body = next.body ?? null;
      }
      if (ctx.mode === "sms") patch.body = next.body ?? null;
      if (ctx.mode === "email_sms") patch.sms_body = next.sms_body ?? null;
      return patch;
    }
    const translations = { ...(cfg.translations || {}) };
    const key = translationStorageKey(cfg.translations, ctx.language);
    const bag: PayflowMessageTranslation = { ...(translationBag(cfg.translations, ctx.language) || {}) };
    apply(bag);
    translations[key] = bag;
    return { translations };
  }

  const versions = { ...versionRecord(cfg) };
  const current: PayflowMessageVersion = { ...(versions[ctx.versionKey] || {}) };
  if (primaryEdit) {
    apply(current);
  } else {
    const translations = { ...(current.translations || {}) };
    const key = translationStorageKey(current.translations, ctx.language);
    const bag: PayflowMessageTranslation = {
      ...(translationBag(current.translations, ctx.language) || {}),
    };
    apply(bag);
    translations[key] = bag;
    current.translations = translations;
  }
  versions[ctx.versionKey] = current;
  return { versions };
}

export function versionSnapshot(
  cfg: PayflowStrategyStepConfig | null | undefined,
  versionKey: string,
): string {
  if (!cfg) return "";
  if (versionKey === MAIN_AUDIENCE) {
    return JSON.stringify({
      subject: cfg.subject || "",
      body: cfg.body || "",
      sms_body: cfg.sms_body || "",
      translations: cfg.translations || null,
    });
  }
  const version = versionRecord(cfg)[versionKey];
  if (!version) return "";
  return JSON.stringify({
    subject: version.subject || "",
    body: version.body || "",
    sms_body: version.sms_body || "",
    translations: version.translations || null,
  });
}

export function isVersionDirty(
  current: PayflowStrategyStepConfig | null | undefined,
  saved: PayflowStrategyStepConfig | null | undefined,
  versionKey: string,
): boolean {
  if (!saved) return false;
  return versionSnapshot(current, versionKey) !== versionSnapshot(saved, versionKey);
}

/** Put one version back to the last saved copy. Other versions stay as they are. */
export function restoreVersionPatch(
  current: PayflowStrategyStepConfig,
  saved: PayflowStrategyStepConfig,
  versionKey: string,
): Partial<PayflowStrategyStepConfig> {
  if (versionKey === MAIN_AUDIENCE) {
    return {
      subject: saved.subject ?? null,
      body: saved.body ?? null,
      sms_body: saved.sms_body ?? null,
      translations: saved.translations ?? null,
      content_origin: saved.content_origin ?? null,
      tone: saved.tone ?? null,
    };
  }
  const versions = { ...versionRecord(current) };
  const savedVersion = versionRecord(saved)[versionKey];
  if (savedVersion) versions[versionKey] = savedVersion;
  else delete versions[versionKey];
  return { versions };
}

export function removeVersionPatch(
  cfg: PayflowStrategyStepConfig,
  versionKey: string,
): Partial<PayflowStrategyStepConfig> | null {
  if (versionKey === MAIN_AUDIENCE) return null;
  const versions = { ...versionRecord(cfg) };
  if (!(versionKey in versions)) return null;
  delete versions[versionKey];
  return { versions };
}

export function stepHasMessageContent(cfg: PayflowStrategyStepConfig): boolean {
  if (cfg.subject || cfg.body || cfg.sms_body || cfg.brief) return true;
  if (translationEntries(cfg.translations).length > 0) return true;
  return Object.keys(versionRecord(cfg)).length > 0;
}

export function explainBrief(brief: PayflowMessageBrief | null | undefined): {
  why: string;
  rest: { label: string; value: string }[];
} {
  if (!brief || typeof brief !== "object") return { why: "", rest: [] };
  const why = typeof brief.why === "string" ? brief.why : "";
  const rest = (
    [
      ["approach", "Approach"],
      ["tone", "Tone"],
      ["length", "Length"],
      ["subject_style", "Subject style"],
      ["lead_option", "Lead"],
      ["call_to_action", "Call to action"],
    ] as const
  )
    .map(([key, label]) => ({ label, value: (brief[key] || "").trim() }))
    .filter((row) => !!row.value);
  return { why, rest };
}

export function briefFor(
  cfg: PayflowStrategyStepConfig,
  versionKey: string,
): PayflowMessageBrief | null {
  if (versionKey === MAIN_AUDIENCE) return cfg.brief || null;
  return versionRecord(cfg)[versionKey]?.brief || null;
}

export function requiredWordingLine(
  aiContext?: { label: string; value: string }[] | null,
): { label: string; value: string } | null {
  const row = (aiContext || []).find((item) => /required wording/i.test(item.label || ""));
  if (!row?.value) return null;
  return row;
}

export function warningsForVersion(
  warnings: PayflowTextWarning[] | null | undefined,
  stepId: string,
  versionKey: string,
): PayflowTextWarning[] {
  return (warnings || []).filter((warning) => {
    if (warning.step_id && warning.step_id !== stepId) return false;
    const text = (warning.text || "").trim();
    if (versionKey === MAIN_AUDIENCE) return text === MAIN_AUDIENCE || text === "default";
    return text === versionKey;
  });
}

export function versionAgeDetail(version: PayflowMessageVersion | undefined): string {
  const criteria = version?.segment?.criteria;
  if (!criteria) return "";
  const min = criteria.min_age;
  const max = criteria.max_age;
  if (min == null && max == null) return "";
  if (min != null && max == null) return `Ages ${min} and over`;
  if (min == null && max != null) return `Ages up to ${max}`;
  return `Ages ${min}–${max}`;
}

function asRecord(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, item]) => typeof item === "number" && Number.isFinite(item),
  );
  if (!entries.length) return null;
  return Object.fromEntries(entries) as Record<string, number>;
}

export function formatDistribution(map?: Record<string, number> | null): string {
  const record = asRecord(map);
  if (!record) return "";
  return Object.entries(record)
    .map(([label, value]) => `${label} ${formatPct(value)}`)
    .join(", ");
}

export function formatPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

function formatAverage(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function personalizationRows(
  audience: PayflowWorkflowAudience | null,
  reminderStage: string,
): { label: string; value: string }[] {
  const profile: PayflowAudienceProfile = audience?.profile || {};
  const countries = formatDistribution(profile.countries);
  const regions = formatDistribution(profile.regions);
  const place = [countries && `Countries: ${countries}`, regions && `Regions: ${regions}`]
    .filter(Boolean)
    .join(" · ");
  const historyParts: string[] = [];
  if (typeof profile.contact_history === "string" && profile.contact_history.trim()) {
    historyParts.push(profile.contact_history.trim());
  } else {
    const history = formatDistribution(asRecord(profile.contact_history));
    if (history) historyParts.push(history);
  }
  if (profile.with_email_pct != null) historyParts.push(`Email on file ${formatPct(profile.with_email_pct)}`);
  if (profile.with_mobile_pct != null) {
    historyParts.push(`Mobile on file ${formatPct(profile.with_mobile_pct)}`);
  }
  const balanceParts: string[] = [];
  if (profile.avg_balance != null) balanceParts.push(`Average ${formatAverage(profile.avg_balance)}`);
  const bands = formatDistribution(profile.balance_bands);
  if (bands) balanceParts.push(bands);
  const arrangement = [
    audience?.situation?.trim() || (audience ? "No payment arrangement" : ""),
    profile.partly_paid_pct != null ? `Partly paid ${formatPct(profile.partly_paid_pct)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    { label: "Age group", value: formatDistribution(profile.age) || "Not available" },
    { label: "Country / Region", value: place || "Not available" },
    { label: "Language preference", value: formatDistribution(profile.languages) || "Not available" },
    { label: "Outstanding balance", value: balanceParts.join(" · ") || "Not available" },
    { label: "Reminder stage", value: reminderStage || "Not available" },
    {
      label: "Communication history & preferences",
      value: historyParts.join(" · ") || "Not available",
    },
    { label: "Payment arrangement status", value: arrangement || "Not available" },
    {
      label: "Number of customers",
      value: audience?.accounts != null ? audience.accounts.toLocaleString() : "Not available",
    },
  ];
}

function audienceKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed === "default" || trimmed === "main_text") return MAIN_AUDIENCE;
  return trimmed;
}

function pushAudience(out: PayflowWorkflowAudience[], item: unknown, stepId?: string) {
  if (!item || typeof item !== "object") return;
  const row = item as Record<string, unknown>;
  const key = String(row.key ?? row.audience ?? row.id ?? "");
  if (!key) return;
  const profile =
    row.profile && typeof row.profile === "object"
      ? (row.profile as PayflowAudienceProfile)
      : null;
  out.push({
    key: audienceKey(key),
    step_id: typeof row.step_id === "string" ? row.step_id : stepId || null,
    accounts: typeof row.accounts === "number" ? row.accounts : null,
    situation: typeof row.situation === "string" ? row.situation : null,
    profile,
  });
}

/** Accepts a list, `{ audiences: [] }`, or a map of step id → list. */
export function normalizeWorkflowAudiences(raw: unknown): PayflowWorkflowAudience[] {
  if (Array.isArray(raw)) {
    const out: PayflowWorkflowAudience[] = [];
    raw.forEach((item) => pushAudience(out, item));
    return out;
  }
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.texts)) return normalizeWorkflowAudiences(obj.texts);
  if (Array.isArray(obj.audiences)) return normalizeWorkflowAudiences(obj.audiences);
  if (Array.isArray(obj.items)) return normalizeWorkflowAudiences(obj.items);
  const out: PayflowWorkflowAudience[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      value.forEach((item) => pushAudience(out, item, key));
      continue;
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if ("profile" in record || "accounts" in record || "key" in record) {
        pushAudience(out, { ...record, key: record.key || key });
      }
    }
  }
  return out;
}

/** Compare step config without key order or empty values, so Discard can match the saved step. */
export function sameConfig(a: unknown, b: unknown): boolean {
  const canon = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canon);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        const item = canon((value as Record<string, unknown>)[key]);
        if (item === null || item === undefined) continue;
        if (
          item &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          Object.keys(item as Record<string, unknown>).length === 0
        ) {
          continue;
        }
        out[key] = item;
      }
      return out;
    }
    return value;
  };
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

export function audienceForVersion(
  rows: PayflowWorkflowAudience[],
  stepId: string,
  versionKey: string,
): PayflowWorkflowAudience | null {
  const keyed = rows.filter((row) => audienceKey(row.key) === versionKey);
  const forStep = keyed.filter((row) => row.step_id && row.step_id === stepId);
  if (forStep.length) return forStep[0] || null;
  return keyed.find((row) => !row.step_id) || null;
}
