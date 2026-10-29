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
import {
  ADDABLE_STEP_KINDS,
  CASE_ACTIONS,
  CHANNELS,
  CONDITION_ATTRIBUTES,
  CONDITION_OPERATORS,
  CONDITION_VALUES,
  MESSAGE_PURPOSES,
  OUTCOMES,
  PAYMENT_ACTIONS,
  REFERENCE_EVENTS,
  REVIEW_REASONS,
  TIME_DIRECTIONS,
  TIME_UNITS,
  renderMessagePreview,
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
} from "../../types";

const SUBJECT_MAX = 255;
const BODY_MAX = 5000;
const REMARKS_MAX = 2000;

/** Clear AI/reviewer text when channel or purpose changes so email copy does not stick on SMS. */
function clearMessageTextPatch(
  patch: Partial<PayflowStrategyStepConfig>,
): Partial<PayflowStrategyStepConfig> {
  return { ...patch, subject: null, body: null, tone: null };
}

function catalogLists(catalog?: PayflowStrategyCatalog | null) {
  return {
    channels: catalog?.channels?.length ? catalog.channels : CHANNELS,
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
  onChange,
  onToggleDisabled,
  onAddAfter,
  onRemove,
  onRewriteMessage,
}: {
  strategy: PayflowStrategy;
  step: PayflowStrategyStep;
  catalog?: PayflowStrategyCatalog | null;
  canEdit?: boolean;
  showTitle?: boolean;
  /** Show Rewrite with AI (Draft / AI Proposed / Under Review only). */
  canWriteMessages?: boolean;
  writingMessages?: boolean;
  onChange: (patch: Partial<PayflowStrategyStepConfig> & { title?: string }) => void;
  onToggleDisabled: () => void;
  onAddAfter: (kind: AddableStepKind) => void;
  onRemove?: () => void;
  onRewriteMessage?: (remarks?: string) => void;
}) {
  const [addKind, setAddKind] = useState<AddableStepKind>("Communication");
  const [rewriteRemarks, setRewriteRemarks] = useState("");
  const lists = catalogLists(catalog);
  const cfg = stepConfig(step);
  const templates = templatesForChannelPurpose(lists.templates, cfg.channel, cfg.purpose);
  const activeTemplate = templateById(lists.templates, cfg.template_id) || templates[0];
  const isEmail = (cfg.channel || "Email") === "Email";
  const hasOwnText = !!(cfg.subject || cfg.body);
  const previewSubject = renderMessagePreview(cfg.subject);
  const previewBody = renderMessagePreview(cfg.body);
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
            <Field label="Channel">
              <SelectInput
                value={cfg.channel ?? "Email"}
                options={lists.channels}
                disabled={!canEdit}
                onChange={(v) =>
                  onChange(clearMessageTextPatch({ channel: v, template_id: "" }))
                }
              />
            </Field>
            <Field label="Message Purpose">
              <SelectInput
                value={cfg.purpose ?? lists.purposes[0]!}
                options={lists.purposes}
                disabled={!canEdit}
                onChange={(v) =>
                  onChange(clearMessageTextPatch({ purpose: v, template_id: "" }))
                }
              />
            </Field>
          </div>

          <div className="space-y-2 rounded-lg border border-border/70 bg-surface/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] font-semibold text-foreground">Message text</p>
              {cfg.tone ? <StatusPill tone="ai">{cfg.tone}</StatusPill> : null}
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              Leave blank to send the template below. Edited text is saved with the step and
              becomes Human Modified.
            </p>
            {isEmail ? (
              <Field label="Subject" hint={`Max ${SUBJECT_MAX} characters.`}>
                <TextInput
                  value={cfg.subject ?? ""}
                  disabled={!canEdit}
                  onChange={(v) =>
                    onChange({ subject: v.slice(0, SUBJECT_MAX) || null })
                  }
                />
              </Field>
            ) : null}
            <Field label="Body" hint={`Max ${BODY_MAX} characters. Use {{first_name}}, {{outstanding_balance}}, {{payment_link}}, {{brand_name}}, …`}>
              <TextArea
                value={cfg.body ?? ""}
                disabled={!canEdit}
                onChange={(v) => onChange({ body: v.slice(0, BODY_MAX) || null })}
              />
            </Field>
            {hasOwnText ? (
              <div className="rounded-lg border border-border/70 bg-card p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Preview (sample values)
                </p>
                {isEmail && previewSubject ? (
                  <p className="mt-2 text-[12.5px] text-foreground">
                    <span className="text-muted-foreground">Subject: </span>
                    {previewSubject}
                  </p>
                ) : null}
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-muted-foreground">
                  {previewBody || "(empty body)"}
                </pre>
              </div>
            ) : null}
            {canWriteMessages && onRewriteMessage ? (
              <div className="space-y-2 border-t border-border/60 pt-3">
                <Field
                  label="Rewrite with AI"
                  hint="Optional remarks for this message only. Takes a few seconds."
                >
                  <TextArea
                    value={rewriteRemarks}
                    disabled={!canEdit || writingMessages}
                    onChange={(v) => setRewriteRemarks(v.slice(0, REMARKS_MAX))}
                    placeholder="e.g. softer tone, mention the payment plan"
                  />
                </Field>
                <Btn
                  disabled={!canEdit || writingMessages}
                  onClick={() =>
                    onRewriteMessage(rewriteRemarks.trim() || undefined)
                  }
                >
                  {writingMessages ? "Writing…" : "Rewrite with AI"}
                </Btn>
              </div>
            ) : null}
          </div>

          {templates.length > 0 && (
            <>
              <Field
                label="Fallback template"
                hint="Used when message text above is empty."
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
            hint="Shown in the Human Review queue Reason column."
          >
            <SelectInput
              value={
                cfg.review_reason && REVIEW_REASONS.includes(cfg.review_reason)
                  ? cfg.review_reason
                  : REVIEW_REASONS[2]!
              }
              options={REVIEW_REASONS}
              disabled={!canEdit}
              onChange={(v) => onChange({ review_reason: v })}
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
            <Field label="Timing Reference">
              <SelectInput
                value={cfg.reference_event ?? lists.referenceEvents[0]!}
                options={lists.referenceEvents}
                disabled={!canEdit}
                onChange={(v) => onChange({ reference_event: v })}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
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
  onClose,
  onChange,
  onToggleDisabled,
  onAddAfter,
  onRemove,
  onRewriteMessage,
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
  onClose: () => void;
  onChange: (patch: Partial<PayflowStrategyStepConfig> & { title?: string }) => void;
  onToggleDisabled: () => void;
  onAddAfter: (kind: AddableStepKind) => void;
  onRemove?: () => void;
  onRewriteMessage?: (remarks?: string) => void;
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
        onChange={onChange}
        onToggleDisabled={onToggleDisabled}
        onAddAfter={onAddAfter}
        onRemove={onRemove}
        onRewriteMessage={onRewriteMessage}
      />
    </Modal>
  );
}
