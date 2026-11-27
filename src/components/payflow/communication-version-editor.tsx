import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import { getPayflowWorkflowAudiences } from "../../api/payflow";
import { cn } from "../../lib/utils";
import {
  BODY_MAX,
  MAIN_AUDIENCE,
  SMS_BODY_MAX,
  SUBJECT_MAX,
  audienceForVersion,
  briefFor,
  communicationVersionOptions,
  explainBrief,
  isVersionDirty,
  languageCodes,
  messageChannelMode,
  normalizeWorkflowAudiences,
  patchVisibleMessage,
  personalizationRows,
  primaryLanguageCode,
  readVisibleMessage,
  removeVersionPatch,
  requiredWordingLine,
  restoreVersionPatch,
  versionAgeDetail,
  versionOptionLabel,
  versionRecord,
  warningsForVersion,
} from "../../lib/message-versions";
import { strategyStatusTone } from "../../lib/strategy-workflow";
import type {
  PayflowStrategy,
  PayflowStrategyStep,
  PayflowStrategyStepConfig,
  PayflowTextWarning,
  PayflowWorkflowAudience,
} from "../../types";
import { FOLLOW_UP_REMINDER_STAGE } from "../../lib/adaptive-workflow";
import { REMINDER_STAGES } from "../../types/emailSubjects";
import { EmailStepPerformance } from "./email-subjects/EmailStepPerformance";
import { Btn, Field, SelectInput, StatusPill, TextArea, TextInput } from "./lovable/payflow-ui";

export function CommunicationVersionEditor({
  strategy,
  step,
  savedConfig,
  canEdit = true,
  canWriteMessages = false,
  writingMessages = false,
  saving = false,
  unsaved = false,
  textWarnings = [],
  followUp = false,
  onChange,
  onSaveVersion,
  onRewriteMessage,
}: {
  strategy: PayflowStrategy;
  step: PayflowStrategyStep;
  /** Last saved config for this step. Dirty checks and Discard use it. */
  savedConfig?: PayflowStrategyStepConfig | null;
  canEdit?: boolean;
  canWriteMessages?: boolean;
  writingMessages?: boolean;
  saving?: boolean;
  /** Any unsaved step edit, including fields outside the selected version's text. */
  unsaved?: boolean;
  textWarnings?: PayflowTextWarning[];
  /** Follow-up text: channel is chosen at send time, and the reminder stage stays Follow-up. */
  followUp?: boolean;
  onChange: (patch: Partial<PayflowStrategyStepConfig>) => void;
  onSaveVersion?: (patch?: Partial<PayflowStrategyStepConfig>) => Promise<boolean | void>;
  /** `audience` omitted rewrites the whole step. `"main"` or a version key rewrites that text. */
  onRewriteMessage?: (remarks?: string, audience?: string) => Promise<boolean | void> | void;
}) {
  const cfg = step.config || {};
  const mode = messageChannelMode(step);
  const primary = primaryLanguageCode(strategy);
  const options = useMemo(() => communicationVersionOptions(cfg), [cfg]);
  const [selectedKey, setSelectedKey] = useState(MAIN_AUDIENCE);
  const [language, setLanguage] = useState(primary);
  const [preview, setPreview] = useState<"Email" | "SMS">(mode === "sms" ? "SMS" : "Email");
  const [remarks, setRemarks] = useState("");
  const [notice, setNotice] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [audiences, setAudiences] = useState<PayflowWorkflowAudience[]>([]);
  const [audienceError, setAudienceError] = useState("");
  const [audienceLoading, setAudienceLoading] = useState(false);

  const languages = languageCodes(cfg, selectedKey, primary);
  const languageKey = languages.join("|");
  const selected = options.find((option) => option.key === selectedKey) || options[0];
  const activeKey = selected?.key || MAIN_AUDIENCE;
  const editable = canEdit && language.toUpperCase() === primary.toUpperCase();
  const dirty = isVersionDirty(cfg, savedConfig, activeKey);
  const needsSave = dirty || unsaved;
  const visible = readVisibleMessage(cfg, activeKey, language, primary, mode);
  const versionWarnings = warningsForVersion(textWarnings, step.id || "", activeKey);
  const emailWarnings = versionWarnings.filter(
    (warning) => (warning.channel || "").toLowerCase() === "email",
  );
  const smsWarnings = versionWarnings.filter(
    (warning) => (warning.channel || "").toLowerCase() === "sms",
  );
  const subjectWarnings = emailWarnings.filter((warning) => /subject/i.test(warning.problem));
  const bodyWarnings = emailWarnings.filter((warning) => !/subject/i.test(warning.problem));
  const explanation = explainBrief(briefFor(cfg, activeKey));
  const wording = requiredWordingLine(strategy.ai_context);
  const showEmail = mode !== "sms";
  const showSms = mode !== "email";
  const selectedVersion = versionRecord(cfg)[activeKey];
  const ageDetail =
    activeKey === MAIN_AUDIENCE
      ? "Used when this step has no version for the customer's age."
      : versionAgeDetail(selectedVersion) || selected?.label || "";

  useEffect(() => {
    setSelectedKey(MAIN_AUDIENCE);
    setLanguage(primary);
    setPreview(mode === "sms" ? "SMS" : "Email");
    setRemarks("");
    setNotice("");
    setRemoveOpen(false);
  }, [step.id, primary, mode]);

  useEffect(() => {
    const available = languageKey.split("|").filter(Boolean);
    if (!available.includes(language)) setLanguage(available[0] || primary);
  }, [languageKey, language, primary]);

  useEffect(() => {
    if (!options.some((option) => option.key === selectedKey)) {
      setSelectedKey(MAIN_AUDIENCE);
    }
  }, [options, selectedKey]);

  useEffect(() => {
    if (!strategy.id || strategy.id <= 0) {
      setAudiences([]);
      return;
    }
    let cancelled = false;
    setAudienceLoading(true);
    setAudienceError("");
    getPayflowWorkflowAudiences(strategy.id)
      .then((raw) => {
        if (!cancelled) setAudiences(normalizeWorkflowAudiences(raw));
      })
      .catch((err) => {
        if (!cancelled) {
          setAudiences([]);
          setAudienceError(
            err instanceof ApiError ? err.detail : "Could not load the audience profile.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setAudienceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [strategy.id, strategy.updated_at]);

  const audience = audienceForVersion(audiences, step.id || "", activeKey);
  const context = personalizationRows(audience, cfg.purpose || step.purpose || "");
  const previewChannel = !showEmail ? "SMS" : !showSms ? "Email" : preview;
  const previewBody = previewChannel === "SMS" ? visible.smsBody : visible.emailBody;
  const statusLabel = needsSave ? "Unsaved changes" : strategy.status;

  function edit(changes: { subject?: string; email?: string; sms?: string }) {
    onChange(patchVisibleMessage(cfg, { versionKey: activeKey, language, primary, mode }, changes));
    setNotice("");
  }

  function switchVersion(label: string) {
    const next = options.find((option) => versionOptionLabel(option, options) === label);
    if (!next || next.key === activeKey) return;
    if (dirty && !window.confirm("You have unsaved changes. Discard them and switch versions?")) {
      return;
    }
    if (dirty && savedConfig) onChange(restoreVersionPatch(cfg, savedConfig, activeKey));
    setSelectedKey(next.key);
    setNotice("");
    setRemoveOpen(false);
  }

  async function save(patch?: Partial<PayflowStrategyStepConfig>) {
    if (!onSaveVersion) return;
    setNotice("");
    const ok = await onSaveVersion(patch);
    if (ok === false) return;
    setRemoveOpen(false);
    if (patch && activeKey !== MAIN_AUDIENCE) setSelectedKey(MAIN_AUDIENCE);
    setNotice(
      patch
        ? "Version removed. That age group now receives the main text."
        : "Version saved. Approving the workflow approves this text with the others.",
    );
  }

  async function regenerate(audienceKey?: string) {
    if (!onRewriteMessage) return;
    setNotice("");
    const ok = await onRewriteMessage(remarks.trim() || undefined, audienceKey);
    if (ok === false) return;
    setNotice(
      audienceKey
        ? "This text was rewritten. The main text, other versions, and other steps were left as they are."
        : "This step was rewritten, including the main text and every version.",
    );
  }

  return (
    <div className="min-w-0 space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">Communication versions</h3>
        <StatusPill tone={needsSave ? "warning" : strategyStatusTone(strategy.status)}>
          {statusLabel}
        </StatusPill>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {mode === "email_sms" && !followUp ? <StatusPill tone="ai">Email + SMS</StatusPill> : null}
        {cfg.tone ? <StatusPill tone="ai">{cfg.tone}</StatusPill> : null}
        {cfg.content_origin ? <StatusPill tone="info">{cfg.content_origin}</StatusPill> : null}
      </div>

      <Field label="Selected version">
        <SelectInput
          value={selected ? versionOptionLabel(selected, options) : "Main / Default"}
          options={options.map((option) => versionOptionLabel(option, options))}
          onChange={switchVersion}
        />
      </Field>
      <p className="text-[11px] text-muted-foreground">{ageDetail}</p>
      {activeKey === MAIN_AUDIENCE ? (
        <p className="text-[11px] text-muted-foreground">
          Customers receive this text unless their age group has its own version.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Message language">
        {languages.map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={language.toUpperCase() === code}
            onClick={() => setLanguage(code)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
              language.toUpperCase() === code
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {code}
          </button>
        ))}
      </div>
      {language.toUpperCase() !== primary.toUpperCase() ? (
        <p className="text-[11px] text-muted-foreground">
          Read-only. Edits are made in {primary}. Other languages are rewritten when you save.
        </p>
      ) : null}

      <details className="border-t border-border pt-2">
        <summary className="cursor-pointer text-xs font-semibold text-foreground">
          Personalization Context
        </summary>
        <div className="mt-2">
          {audienceLoading ? (
            <p className="text-[11px] text-muted-foreground">Loading audience profile…</p>
          ) : null}
          {audienceError ? (
            <p className="text-[11px] text-destructive" role="alert">
              {audienceError}
            </p>
          ) : null}
          {!audienceLoading && !audienceError && !audience ? (
            <p className="text-[11px] text-muted-foreground">
              No audience profile for this version yet.
            </p>
          ) : null}
          <dl className="mt-2 grid gap-2 text-[11px]">
            {context.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="font-medium text-foreground">{row.label}</dt>
                <dd className="break-words text-muted-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Figures are percentages of this version&apos;s customers, or averages. They describe
            today&apos;s accounts, not one person, and can differ from the day the text was written.
          </p>
        </div>
      </details>

      {versionWarnings.length > 0 ? (
        <p className="text-[11.5px] text-amber-800">
          Saved. The notes below are about this text — it was still saved.
        </p>
      ) : null}

      {showEmail ? (
        <Field label="Email Subject" hint={editable ? `Max ${SUBJECT_MAX} characters.` : undefined}>
          <TextInput
            value={visible.subject}
            disabled={!editable}
            onChange={(subject) => edit({ subject })}
          />
          <WarningList items={subjectWarnings.map((warning) => warning.problem)} />
        </Field>
      ) : null}
      {showEmail ? (
        <Field
          label="Email Body"
          hint={
            editable
              ? `Max ${BODY_MAX} characters. Use {{first_name}}, {{outstanding_balance}}, {{payment_link}}, {{brand_name}}.`
              : undefined
          }
        >
          <TextArea
            value={visible.emailBody}
            disabled={!editable}
            onChange={(email) => edit({ email })}
          />
          <WarningList items={bodyWarnings.map((warning) => warning.problem)} />
        </Field>
      ) : null}
      {showSms ? (
        <Field
          label="SMS Content"
          hint={
            editable
              ? `Max ${SMS_BODY_MAX} characters. ${
                  mode === "sms"
                    ? "On an SMS-only step this text is stored as the message body."
                    : "Start with {{brand_name}}: and end with Reply STOP to opt out."
                }`
              : undefined
          }
        >
          <TextArea
            value={visible.smsBody}
            disabled={!editable}
            onChange={(sms) => edit({ sms })}
          />
          <WarningList items={smsWarnings.map((warning) => warning.problem)} />
        </Field>
      ) : null}

      <details className="rounded-lg border border-border p-2.5">
        <summary className="cursor-pointer text-xs font-semibold text-ai">AI Explanation</summary>
        {explanation.why ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{explanation.why}</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No explanation was recorded for this text.
          </p>
        )}
        {explanation.rest.length > 0 ? (
          <dl className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {explanation.rest.map((row) => (
              <div key={row.label}>
                <dt className="inline font-medium text-foreground">{row.label}. </dt>
                <dd className="inline">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </details>

      {canWriteMessages ? (
        <Field
          label="Remarks for regenerate"
          hint="Optional. The AI follows this when it rewrites the selected text, or the whole step."
        >
          <TextArea
            value={remarks}
            disabled={writingMessages || saving}
            onChange={(value) => setRemarks(value.slice(0, 2000))}
            placeholder="e.g. shorter, mention the payment plan"
          />
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Btn
          variant="primary"
          disabled={!canEdit || !needsSave || saving || !onSaveVersion}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save version"}
        </Btn>
        {dirty && savedConfig ? (
          <Btn
            disabled={!canEdit || saving}
            onClick={() => {
              onChange(restoreVersionPatch(cfg, savedConfig, activeKey));
              setNotice("Changes discarded.");
            }}
          >
            Discard changes
          </Btn>
        ) : null}
        {canWriteMessages ? (
          <Btn
            disabled={writingMessages || needsSave || saving}
            onClick={() => void regenerate(activeKey)}
          >
            {writingMessages ? "Regenerating…" : "Regenerate"}
          </Btn>
        ) : null}
        {canWriteMessages ? (
          <Btn
            disabled={writingMessages || needsSave || saving}
            onClick={() => void regenerate(undefined)}
          >
            Regenerate step
          </Btn>
        ) : null}
        {activeKey !== MAIN_AUDIENCE ? (
          <Btn
            variant="danger"
            disabled={!canEdit || saving}
            onClick={() => setRemoveOpen(true)}
          >
            Remove version
          </Btn>
        ) : null}
      </div>
      {needsSave && canWriteMessages ? (
        <p className="text-[11px] text-muted-foreground">
          Save this version before regenerating. Regenerate uses the saved text.
        </p>
      ) : null}

      {removeOpen ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.06] p-3">
          <p className="text-[12.5px] font-semibold text-foreground">
            Remove this communication version?
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {selected?.label || "This version"} will be removed from this step. Other versions stay.
            Customers in that age group receive the main text.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn disabled={saving} onClick={() => setRemoveOpen(false)}>
              Keep version
            </Btn>
            <Btn
              variant="danger"
              disabled={saving || !onSaveVersion}
              onClick={() => {
                const patch = removeVersionPatch(cfg, activeKey);
                if (!patch) return;
                void save(patch);
              }}
            >
              Remove version
            </Btn>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p role="status" className="text-xs text-primary">
          {notice}
        </p>
      ) : null}

      {showEmail && showSms ? (
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="tablist">
          {(["Email", "SMS"] as const).map((channel) => (
            <button
              key={channel}
              type="button"
              role="tab"
              aria-selected={previewChannel === channel}
              onClick={() => setPreview(channel)}
              className={cn(
                "rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                previewChannel === channel
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {channel} preview
            </button>
          ))}
        </div>
      ) : null}
      <MessagePreview
        name={`${selected?.label || "Main / Default"} · ${previewChannel}`}
        channel={previewChannel}
        subject={previewChannel === "Email" ? visible.subject : undefined}
        body={previewBody || (previewChannel === "SMS" ? "(empty SMS)" : "(empty email body)")}
      />

      <details className="border-t border-border pt-2">
        <summary className="cursor-pointer text-xs font-semibold text-primary">
          Compliance execution preview
        </summary>
        <div className="mt-2 space-y-1.5">
          <p className="text-[12px] font-medium text-foreground">Required wording</p>
          {wording ? (
            <p className="text-[12px] leading-relaxed text-muted-foreground">{wording.value}</p>
          ) : (
            <p className="text-[11.5px] text-muted-foreground">
              No required wording is recorded on this workflow.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            The message is blocked or held for review at send time if this wording is missing. An
            edit that leaves it out is still saved, and the warning appears on the text.
          </p>
        </div>
      </details>

      {showEmail ? (
        <details className="border-t border-border pt-2">
          <summary className="cursor-pointer text-xs font-semibold text-foreground">
            Performance insights
          </summary>
          <div className="mt-3 space-y-3">
            <Field
              label="Reminder stage"
              hint={
                followUp
                  ? "Follow-up results are counted apart from the planned reminders."
                  : "Compared with similar reminders. Leave unset and PayFlow infers it from the purpose and position."
              }
            >
              <SelectInput
                value={cfg.reminder_stage || (followUp ? FOLLOW_UP_REMINDER_STAGE : "Not set")}
                options={[
                  followUp ? FOLLOW_UP_REMINDER_STAGE : "Not set",
                  ...REMINDER_STAGES,
                  ...(cfg.reminder_stage &&
                  cfg.reminder_stage !== FOLLOW_UP_REMINDER_STAGE &&
                  !(REMINDER_STAGES as readonly string[]).includes(cfg.reminder_stage)
                    ? [cfg.reminder_stage]
                    : []),
                ]}
                disabled={!canEdit || followUp}
                onChange={(value) =>
                  onChange({ reminder_stage: value === "Not set" ? null : value })
                }
              />
            </Field>
            <EmailStepPerformance
              clientId={strategy.client_id}
              strategyId={strategy.id > 0 ? strategy.id : null}
              stepId={step.id}
              purpose={cfg.purpose}
              reminderStage={cfg.reminder_stage || (followUp ? FOLLOW_UP_REMINDER_STAGE : null)}
              canEdit={editable}
              onApply={(patch) => {
                const changes: { subject?: string; email?: string } = {};
                if (patch.subject != null) changes.subject = patch.subject;
                if (patch.body != null) changes.email = patch.body;
                const next = patchVisibleMessage(
                  cfg,
                  { versionKey: activeKey, language, primary, mode },
                  changes,
                );
                onChange({
                  ...next,
                  ...(patch.reminder_stage !== undefined
                    ? { reminder_stage: patch.reminder_stage }
                    : {}),
                  ...(patch.content_origin ? { content_origin: patch.content_origin } : {}),
                });
              }}
            />
          </div>
        </details>
      ) : null}

      <div className="border-t border-border pt-3">
        <h4 className="mb-2 text-xs font-semibold text-foreground">Version Summary</h4>
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
          Approving the workflow approves every text together. A version cannot be switched off —
          remove it, or leave it. Main / Default stays. Text notes never block approval.
        </p>
        <ul className="space-y-1.5">
          {options.map((option) => {
            const rowDirty = isVersionDirty(cfg, savedConfig, option.key);
            return (
              <li key={option.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 break-words text-foreground">
                  {versionOptionLabel(option, options)}
                </span>
                <StatusPill tone={rowDirty ? "warning" : "neutral"}>
                  {rowDirty ? "Unsaved changes" : "Included"}
                </StatusPill>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function MessagePreview({
  name,
  channel,
  subject,
  body,
}: {
  name: string;
  channel: string;
  subject?: string;
  body: string;
}) {
  const isSms = channel === "SMS";
  return (
    <div className="rounded-lg border border-border/70 bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
          {isSms ? "SMS" : "Email"}
        </span>
        <p className="text-[12.5px] font-semibold text-foreground">{name}</p>
      </div>
      {subject ? (
        <p className="mt-2 text-[12px] text-foreground">
          <span className="text-muted-foreground">Subject: </span>
          {subject}
        </p>
      ) : null}
      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-muted-foreground">
        {body}
      </pre>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Values in double braces are filled per customer when the message is sent.
      </p>
    </div>
  );
}

function WarningList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-1 space-y-1" role="alert">
      {items.map((problem) => (
        <p key={problem} className="text-[11.5px] leading-relaxed text-amber-800">
          {problem}
        </p>
      ))}
    </div>
  );
}
