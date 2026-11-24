import { useState } from "react";
import {
  Btn,
  Field,
  SelectInput,
  StatusPill,
  TextArea,
  TextInput,
} from "./lovable/payflow-ui";
import { Modal } from "../ui/Modal";
import { CommunicationVersionEditor } from "./communication-version-editor";
import { stepHasMessageContent } from "../../lib/message-versions";
import {
  ADDABLE_STEP_KINDS,
  CASE_ACTIONS,
  CHANNELS,
  CONDITION_ATTRIBUTES,
  CONDITION_OPERATORS,
  CONDITION_VALUES,
  CONTACT_CHANNEL,
  MESSAGE_PURPOSES,
  OUTCOMES,
  PAYMENT_ACTIONS,
  REFERENCE_EVENTS,
  REVIEW_REASONS,
  TIME_DIRECTIONS,
  TIME_UNITS,
  displayChannel,
  isContactStep,
  referenceEventsForStep,
  stepConfig,
  templateById,
  templatesForChannelPurpose,
  type AddableStepKind,
} from "../../lib/strategy-workflow";
import type {
  PayflowMessageTemplate,
  PayflowStrategy,
  PayflowStrategyCatalog,
  PayflowStrategyStep,
  PayflowStrategyStepConfig,
  PayflowTextWarning,
} from "../../types";

/**
 * Clear AI/reviewer text when channel or purpose changes so an SMS is not sent
 * with an email's copy. Age versions and the main explanation go with it.
 */
function clearMessageTextPatch(
  patch: Partial<PayflowStrategyStepConfig>,
): Partial<PayflowStrategyStepConfig> {
  return {
    ...patch,
    subject: null,
    body: null,
    sms_body: null,
    tone: null,
    content_origin: null,
    brief: null,
    translations: null,
    versions: null,
  };
}

const CLEAR_MESSAGES_WARNING =
  "This clears the step's texts and its age versions. Use Regenerate on the step to write them again.";

/** Persist contact mode as no channel (matches AI / worker contract). */
function channelPatch(channelLabel: string): Partial<PayflowStrategyStepConfig> {
  if (channelLabel === CONTACT_CHANNEL) {
    return clearMessageTextPatch({ channel: null, template_id: null });
  }
  return clearMessageTextPatch({ channel: channelLabel, template_id: "" });
}

function catalogLists(catalog?: PayflowStrategyCatalog | null) {
  const rawChannels = catalog?.channels?.length ? catalog.channels : CHANNELS;
  const channels = rawChannels.includes(CONTACT_CHANNEL)
    ? rawChannels
    : [CONTACT_CHANNEL, ...rawChannels];
  return {
    channels,
    purposes: catalog?.message_purposes?.length ? catalog.message_purposes : MESSAGE_PURPOSES,
    referenceEvents: catalog?.reference_events?.length
      ? catalog.reference_events
      : REFERENCE_EVENTS,
    timeUnits: catalog?.time_units?.length ? catalog.time_units : TIME_UNITS,
    timeDirections: catalog?.time_directions?.length
      ? catalog.time_directions
      : TIME_DIRECTIONS,
    conditionAttributes: catalog?.condition_attributes?.length
      ? catalog.condition_attributes
      : CONDITION_ATTRIBUTES,
    conditionOperators: catalog?.condition_operators?.length
      ? catalog.condition_operators
      : CONDITION_OPERATORS,
    conditionValues:
      catalog?.condition_values && Object.keys(catalog.condition_values).length
        ? catalog.condition_values
        : CONDITION_VALUES,
    caseActions: catalog?.case_actions?.length ? catalog.case_actions : CASE_ACTIONS,
    paymentActions: catalog?.payment_actions?.length
      ? catalog.payment_actions
      : PAYMENT_ACTIONS,
    outcomes: catalog?.outcomes?.length ? catalog.outcomes : OUTCOMES,
    templates: catalog?.message_templates || [],
  };
}

export function TemplatePreview({
  template,
}: {
  template?: PayflowMessageTemplate | null;
}) {
  if (!template) return null;
  const isSms = template.channel === "SMS";
  return (
    <div className="rounded-lg border border-border/70 bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
          {isSms ? "SMS" : "Email"}
        </span>
        <p className="text-[12.5px] font-semibold text-foreground">{template.name}</p>
      </div>
      {template.subject && (
        <p className="mt-2 text-[12px] text-foreground">
          <span className="text-muted-foreground">Subject: </span>
          {template.subject}
        </p>
      )}
      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-muted-foreground">
        {template.body}
      </pre>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Values in double braces are filled per customer at send time.
      </p>
    </div>
  );
}

export function StepConfigForm({
  strategy,
  step,
  catalog,
  canEdit = true,
  showTitle = true,
  canWriteMessages = false,
  writingMessages = false,
  saving = false,
  unsaved = false,
  savedConfig,
  textWarnings,
  onChange,
  onToggleDisabled,
  onAddAfter,
  onRemove,
  onRewriteMessage,
  onSaveVersion,
}: {
  strategy: PayflowStrategy;
  step: PayflowStrategyStep;
  catalog?: PayflowStrategyCatalog | null;
  canEdit?: boolean;
  showTitle?: boolean;
  /** Regenerate is allowed for Draft / AI Proposed / Under Review only. */
  canWriteMessages?: boolean;
  writingMessages?: boolean;
  saving?: boolean;
  unsaved?: boolean;
  /** Server copy of this step, used to detect unsaved version text. */
  savedConfig?: PayflowStrategyStepConfig | null;
  textWarnings?: PayflowTextWarning[];
  onChange: (patch: Partial<PayflowStrategyStepConfig> & { title?: string }) => void;
  onToggleDisabled: () => void;
  onAddAfter: (kind: AddableStepKind) => void;
  onRemove?: () => void;
  onRewriteMessage?: (remarks?: string, audience?: string) => Promise<boolean | void> | void;
  onSaveVersion?: (patch?: Partial<PayflowStrategyStepConfig>) => Promise<boolean | void>;
}) {
  const [addKind, setAddKind] = useState<AddableStepKind>("Communication");
  const lists = catalogLists(catalog);
  const cfg = stepConfig(step);
  const contactStep = isContactStep(step);
  const channelLabel = displayChannel(step);
  const templates = templatesForChannelPurpose(
    lists.templates,
    contactStep ? "Email" : cfg.channel,
    cfg.purpose,
  );
  const smsTemplates = templatesForChannelPurpose(lists.templates, "SMS", cfg.purpose);
  const activeTemplate = templateById(lists.templates, cfg.template_id) || templates[0];
  const activeSmsTemplate = smsTemplates[0];
  const hasOwnText = !!(cfg.subject || cfg.body || cfg.sms_body);
  const conditionValueOptions =
    lists.conditionValues[cfg.attribute || ""] ||
    CONDITION_VALUES[cfg.attribute || ""] ||
    [];
  const byId = Object.fromEntries(
    (strategy.steps || []).map((s, i) => [s.id || `s${i + 1}`, s]),
  );

  return (
    <div className="space-y-3">
      {showTitle ? (
        <Field label="Title">
          <TextInput
            value={step.title}
            disabled={!canEdit}
            onChange={(v) => onChange({ title: v })}
          />
        </Field>
      ) : null}

      {step.kind === "Communication" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Channel"
              hint={
                contactStep
                  ? "Worker picks Email or SMS per customer, and switches if one fails."
                  : undefined
              }
            >
              <SelectInput
                value={channelLabel}
                options={
                  lists.channels.includes(CONTACT_CHANNEL)
                    ? lists.channels
                    : [CONTACT_CHANNEL, ...lists.channels]
                }
                disabled={!canEdit}
                onChange={(v) => {
                  if (v === channelLabel) return;
                  if (stepHasMessageContent(cfg) && !window.confirm(CLEAR_MESSAGES_WARNING)) return;
                  onChange(channelPatch(v));
                }}
              />
            </Field>
            <Field label="Message Purpose">
              <SelectInput
                value={cfg.purpose ?? lists.purposes[0]!}
                options={lists.purposes}
                disabled={!canEdit}
                onChange={(v) => {
                  if (v === (cfg.purpose ?? lists.purposes[0])) return;
                  if (stepHasMessageContent(cfg) && !window.confirm(CLEAR_MESSAGES_WARNING)) return;
                  onChange(clearMessageTextPatch({ purpose: v, template_id: "" }));
                }}
              />
            </Field>
          </div>

          {!contactStep && templates.length > 0 && (
            <>
              <Field
                label="Template"
                hint="What the customer receives at this step. Used when this step has no message text of its own."
              >
                <SelectInput
                  value={activeTemplate?.name ?? ""}
                  options={templates.map((t) => t.name)}
                  disabled={!canEdit}
                  onChange={(name) => {
                    const match = templates.find((t) => t.name === name);
                    if (match) onChange({ template_id: match.id });
                  }}
                />
              </Field>
              {!hasOwnText ? <TemplatePreview template={activeTemplate} /> : null}
            </>
          )}
          {contactStep && !hasOwnText ? (
            <div className="space-y-2">
              <p className="text-[11.5px] text-muted-foreground">
                No own text yet — the worker uses the purpose templates for Email and SMS.
              </p>
              <TemplatePreview template={activeTemplate} />
              {activeSmsTemplate ? <TemplatePreview template={activeSmsTemplate} /> : null}
            </div>
          ) : null}
          <CommunicationVersionEditor
            strategy={strategy}
            step={step}
            savedConfig={savedConfig}
            canEdit={canEdit}
            canWriteMessages={canWriteMessages}
            writingMessages={writingMessages}
            saving={saving}
            unsaved={unsaved}
            textWarnings={textWarnings}
            onChange={onChange}
            onSaveVersion={onSaveVersion}
            onRewriteMessage={onRewriteMessage}
          />
        </>
      )}

      {step.kind === "Payment Action" && (
        <Field label="Payment Action">
          <SelectInput
            value={cfg.action ?? lists.paymentActions[0]!}
            options={lists.paymentActions}
            disabled={!canEdit}
            onChange={(v) => onChange({ action: v })}
          />
        </Field>
      )}

      {step.kind === "Case Action" && (
        <Field label="Case Action">
          <SelectInput
            value={cfg.action ?? lists.caseActions[0]!}
            options={lists.caseActions}
            disabled={!canEdit}
            onChange={(v) => onChange({ action: v })}
          />
        </Field>
      )}

      {step.kind === "Outcome" && (
        <Field label="Outcome">
          <SelectInput
            value={cfg.outcome ?? lists.outcomes[0]!}
            options={lists.outcomes}
            disabled={!canEdit}
            onChange={(v) => onChange({ outcome: v })}
          />
        </Field>
      )}

      {step.kind === "Human Review" && (
        <>
          <Field
            label="Review Reason"
            hint="Shown in the Human Review queue Reason column. Save after choosing so it persists."
          >
            <SelectInput
              value={
                cfg.review_reason && REVIEW_REASONS.includes(cfg.review_reason)
                  ? cfg.review_reason
                  : "Select a reason…"
              }
              options={["Select a reason…", ...REVIEW_REASONS]}
              disabled={!canEdit}
              onChange={(v) =>
                onChange({
                  review_reason: v === "Select a reason…" ? null : v,
                })
              }
            />
          </Field>
          <Field label="Review Note" hint="Shown to the supervisor who picks up the review.">
            <TextArea
              value={cfg.note ?? step.detail ?? ""}
              disabled={!canEdit}
              onChange={(v) => onChange({ note: v })}
            />
          </Field>
        </>
      )}

      {step.kind === "AI Reassessment" && (
        <Field label="Note">
          <TextArea
            value={cfg.note ?? step.detail ?? ""}
            disabled={!canEdit}
            onChange={(v) => onChange({ note: v })}
          />
        </Field>
      )}

      {step.kind === "Condition" && (
        <>
          <Field label="Condition">
            <SelectInput
              value={cfg.attribute ?? lists.conditionAttributes[0]!}
              options={lists.conditionAttributes}
              disabled={!canEdit}
              onChange={(v) =>
                onChange({
                  attribute: v,
                  value: (lists.conditionValues[v] || CONDITION_VALUES[v] || [])[0] || "",
                })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Operator">
              <SelectInput
                value={cfg.operator ?? "Equals"}
                options={lists.conditionOperators}
                disabled={!canEdit}
                onChange={(v) => onChange({ operator: v })}
              />
            </Field>
            <Field label="Value">
              <SelectInput
                value={cfg.value ?? conditionValueOptions[0] ?? ""}
                options={
                  conditionValueOptions.length
                    ? conditionValueOptions
                    : [cfg.value || ""]
                }
                disabled={!canEdit}
                onChange={(v) => onChange({ value: v })}
              />
            </Field>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface px-3 py-2.5 text-[12px]">
            <p className="text-muted-foreground">
              <span className="font-semibold text-success">YES path</span> →{" "}
              {step.yes ? byId[step.yes]?.title || step.yes : "End of strategy"}
            </p>
            <p className="mt-1 text-muted-foreground">
              <span className="font-semibold text-destructive">NO path</span> →{" "}
              {step.no ? byId[step.no]?.title || step.no : "End of strategy"}
            </p>
          </div>
        </>
      )}

      {(step.kind === "Communication" ||
        step.kind === "Wait" ||
        step.kind === "Trigger" ||
        !!cfg.reference_event) &&
        step.kind !== "Condition" &&
        step.kind !== "Outcome" && (
          <>
            <Field
              label="Timing Reference"
              hint={
                contactStep
                  ? "Contact steps time from Previous Action — Email/SMS delivery is handled by the worker."
                  : undefined
              }
            >
              <SelectInput
                value={
                  referenceEventsForStep(step, lists.referenceEvents).includes(
                    cfg.reference_event || "",
                  )
                    ? (cfg.reference_event as string)
                    : referenceEventsForStep(step, lists.referenceEvents)[0]!
                }
                options={referenceEventsForStep(step, lists.referenceEvents)}
                disabled={!canEdit}
                onChange={(v) => onChange({ reference_event: v })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Field label="Number">
                <TextInput
                  value={String(cfg.amount ?? 0)}
                  disabled={!canEdit}
                  onChange={(v) =>
                    onChange({
                      amount: Math.max(0, Number(v.replace(/[^\d.]/g, "")) || 0),
                    })
                  }
                />
              </Field>
              <Field label="Unit">
                <SelectInput
                  value={cfg.unit ?? "Days"}
                  options={lists.timeUnits}
                  disabled={!canEdit}
                  onChange={(v) => onChange({ unit: v })}
                />
              </Field>
              <Field label="Before / After">
                <SelectInput
                  value={cfg.direction ?? "After"}
                  options={lists.timeDirections}
                  disabled={!canEdit}
                  onChange={(v) => onChange({ direction: v })}
                />
              </Field>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              {cfg.amount
                ? `Runs ${cfg.amount} ${(cfg.unit ?? "Days").toLowerCase()} ${(cfg.direction ?? "After").toLowerCase()} ${cfg.reference_event || "the reference event"}.`
                : `Runs immediately when ${(cfg.reference_event || "the event").toLowerCase()} occurs.`}
            </p>
          </>
        )}

      {canEdit && step.kind !== "Trigger" && (
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          <Btn onClick={onToggleDisabled}>
            {step.disabled ? "Enable step" : "Disable step"}
          </Btn>
          {onRemove && step.kind !== "Outcome" && (
            <Btn variant="danger" onClick={onRemove}>
              Remove step
            </Btn>
          )}
        </div>
      )}

      {canEdit && step.kind !== "Condition" && step.kind !== "Outcome" && (
        <div className="border-t border-border/60 pt-3">
          <Field
            label="Add a step after this one"
            hint="Choose Condition to split the flow into YES / NO paths."
          >
            <SelectInput
              value={addKind}
              options={ADDABLE_STEP_KINDS}
              onChange={(v) => setAddKind(v as AddableStepKind)}
            />
          </Field>
          <Btn className="mt-2" onClick={() => onAddAfter(addKind)}>
            {addKind === "Condition" ? "Add condition" : "Add step"}
          </Btn>
        </div>
      )}
    </div>
  );
}

export function StepEditorDialog({
  strategy,
  step,
  catalog,
  open,
  canEdit = true,
  busy = false,
  error,
  canWriteMessages = false,
  writingMessages = false,
  unsaved = false,
  savedConfig,
  textWarnings,
  onClose,
  onChange,
  onToggleDisabled,
  onAddAfter,
  onRemove,
  onRewriteMessage,
  onSaveVersion,
}: {
  strategy: PayflowStrategy;
  step: PayflowStrategyStep | null;
  catalog?: PayflowStrategyCatalog | null;
  open: boolean;
  canEdit?: boolean;
  busy?: boolean;
  error?: string;
  canWriteMessages?: boolean;
  writingMessages?: boolean;
  unsaved?: boolean;
  savedConfig?: PayflowStrategyStepConfig | null;
  textWarnings?: PayflowTextWarning[];
  onClose: () => void;
  onChange: (patch: Partial<PayflowStrategyStepConfig> & { title?: string }) => void;
  onToggleDisabled: () => void;
  onAddAfter: (kind: AddableStepKind) => void;
  onRemove?: () => void;
  onRewriteMessage?: (remarks?: string, audience?: string) => Promise<boolean | void> | void;
  onSaveVersion?: (patch?: Partial<PayflowStrategyStepConfig>) => Promise<boolean | void>;
}) {
  if (!open || !step) return null;
  return (
    <Modal
      open={open}
      title={step.title}
      titleExtra={
        <StatusPill tone={step.origin === "AI Proposed" ? "ai" : "info"}>
          {step.origin || "Human Modified"}
        </StatusPill>
      }
      showClose
      description={`${step.kind} step — adjust the details below. Changes are recorded as human modifications.`}
      onClose={onClose}
      size="wide"
      overlayClassName="z-[70]"
      footer={
        <div className="mt-2 flex justify-end gap-2.5">
          <Btn variant="primary" disabled={busy} onClick={onClose}>
            {busy ? "Saving…" : "Done"}
          </Btn>
        </div>
      }
    >
      {error ? <p className="mb-3 text-[12.5px] text-destructive">{error}</p> : null}
      <StepConfigForm
        strategy={strategy}
        step={step}
        catalog={catalog}
        canEdit={canEdit}
        showTitle={false}
        canWriteMessages={canWriteMessages}
        writingMessages={writingMessages}
        saving={busy}
        unsaved={unsaved}
        savedConfig={savedConfig}
        textWarnings={textWarnings}
        onChange={onChange}
        onToggleDisabled={onToggleDisabled}
        onAddAfter={onAddAfter}
        onRemove={onRemove}
        onRewriteMessage={onRewriteMessage}
        onSaveVersion={onSaveVersion}
      />
    </Modal>
  );
}
