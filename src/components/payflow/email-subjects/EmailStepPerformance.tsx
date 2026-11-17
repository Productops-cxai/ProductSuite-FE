import { useEffect, useState } from "react";
import { ApiError } from "../../../api/client";
import {
  draftEmailForNewStep,
  draftWorkflowEmail,
  getWorkflowMessageHistory,
  listEmailSubjectSuggestions,
} from "../../../api/emailSubjects";
import { usePayFlowAccess } from "../../../context/PayFlowAccessContext";
import { formatRate, formatWhen } from "../../../lib/emailSubjectFormat";
import { REMINDER_STAGES } from "../../../types/emailSubjects";
import type {
  EmailMessageHistoryItem,
  EmailSubjectSuggestionsResponse,
} from "../../../types/emailSubjects";
import { Btn, Field, TextArea } from "../lovable/payflow-ui";
import { MeasuredMetrics } from "./MeasuredMetrics";

export function EmailStepPerformance({
  clientId,
  strategyId,
  stepId,
  purpose,
  reminderStage,
  canEdit,
  onApply,
}: {
  clientId?: number | null;
  strategyId?: number | null;
  stepId?: string | null;
  purpose?: string | null;
  reminderStage?: string | null;
  canEdit: boolean;
  onApply: (patch: {
    subject?: string | null;
    body?: string | null;
    content_origin?: string | null;
    reminder_stage?: string | null;
  }) => void;
}) {
  const { hasPermission } = usePayFlowAccess();
  const canDraft = canEdit && hasPermission("create_edit_workflows");
  const [suggestions, setSuggestions] = useState<EmailSubjectSuggestionsResponse | null>(null);
  const [history, setHistory] = useState<EmailMessageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    if (!clientId) {
      setSuggestions(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    listEmailSubjectSuggestions({
      client_id: clientId,
      strategy_id: strategyId && strategyId > 0 ? strategyId : undefined,
      reminder_stage: reminderStage || undefined,
      purpose: purpose || undefined,
    })
      .then((response) => {
        if (!cancelled) setSuggestions(response);
      })
      .catch((err) => {
        if (!cancelled) {
          setSuggestions(null);
          setError(err instanceof ApiError ? err.detail : "Could not load subject suggestions.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, strategyId, reminderStage, purpose]);

  useEffect(() => {
    if (!strategyId || strategyId <= 0) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setHistoryError("");
    getWorkflowMessageHistory(strategyId, stepId || undefined)
      .then((response) => {
        if (!cancelled) setHistory(response.items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setHistory([]);
          setHistoryError(err instanceof ApiError ? err.detail : "Could not load message history.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [strategyId, stepId]);

  async function draft() {
    if (!canDraft || drafting || !clientId) return;
    setDrafting(true);
    setError("");
    setDraftNote("");
    try {
      const response =
        strategyId && strategyId > 0 && stepId
          ? await draftWorkflowEmail(strategyId, {
              step_id: stepId,
              remarks: remarks.trim() || undefined,
            })
          : await draftEmailForNewStep({
              client_id: clientId,
              purpose: purpose || undefined,
              reminder_stage: reminderStage || undefined,
              remarks: remarks.trim() || undefined,
            });
      const evidenceStage = response.evidence?.reminder_stage;
      onApply({
        subject: response.subject,
        body: response.body ?? null,
        content_origin: response.origin || "AI Generated",
        reminder_stage: typeof evidenceStage === "string" ? evidenceStage : reminderStage,
      });
      setDraftNote(
        `${response.explanation} Nothing was saved. Edit the subject or body, then save the workflow when you want to keep it.${
          response.generated_by === "history"
            ? " The AI was unavailable, so this is the client's best measured email."
            : ""
        }`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not draft an email from performance.");
    } finally {
      setDrafting(false);
    }
  }

  const stageKnown = !reminderStage || (REMINDER_STAGES as readonly string[]).includes(reminderStage);

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-surface p-3">
      <div>
        <p className="text-[12.5px] font-semibold text-foreground">Historical performance</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
          Suggestions use this client's own measured emails
          {suggestions?.scope ? ` (${suggestions.scope})` : ""}. Choosing one fills the form. It does not
          replace a live template until you save, and an active workflow returns to review.
        </p>
        {!stageKnown ? (
          <p className="mt-1 text-[11.5px] text-warning-foreground">
            This reminder stage is not one of the measured stages, so comparisons may be empty.
          </p>
        ) : null}
      </div>

      {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
      {loading ? <p className="text-[12px] text-muted-foreground">Loading measured subjects…</p> : null}
      {!loading && suggestions && suggestions.rows.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          No measured subjects for this client and reminder context yet.
        </p>
      ) : null}

      <ul className="space-y-2">
        {(suggestions?.rows || []).map((row) => (
          <li key={`${row.subject}-${row.source_subject}`} className="rounded-md border border-border/70 bg-card p-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-[12.5px] font-medium text-foreground">{row.subject}</p>
              <span className="text-[11px] text-muted-foreground">
                {row.measured ? "Measured" : "Not sent yet"} · {formatRate(row.metrics.conversion)} conversion
              </span>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{row.explanation}</p>
            {!row.measured ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Figures are from “{row.source_subject}”, which has been sent. This variation has not.
              </p>
            ) : null}
            <div className="mt-2">
              <MeasuredMetrics metrics={row.metrics} compact />
            </div>
            {canEdit ? (
              <Btn
                className="mt-2"
                onClick={() =>
                  onApply({
                    subject: row.subject,
                    ...(row.body ? { body: row.body } : {}),
                    content_origin: row.body_origin || (row.measured ? "Human Created" : "AI Generated"),
                  })
                }
              >
                Use this subject
              </Btn>
            ) : null}
          </li>
        ))}
      </ul>
      {suggestions?.disclaimer ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{suggestions.disclaimer}</p>
      ) : null}

      {canDraft && clientId ? (
        <div className="border-t border-border/60 pt-3">
          <Field label="Note for the draft" hint="Optional. Asks for a subject and body. Nothing is saved.">
            <TextArea
              value={remarks}
              onChange={(value) => setRemarks(value.slice(0, 2000))}
              placeholder="e.g. shorter, mention the payment plan"
              disabled={drafting}
            />
          </Field>
          <Btn
            className="mt-2"
            variant="primary"
            disabled={drafting || (!!strategyId && strategyId > 0 && !stepId)}
            onClick={() => void draft()}
          >
            {drafting ? "Drafting…" : "Draft from performance"}
          </Btn>
          {strategyId && strategyId > 0 && !stepId ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Save the step before drafting against this workflow.</p>
          ) : null}
          {draftNote ? <p className="mt-2 text-[12px] leading-relaxed text-foreground">{draftNote}</p> : null}
        </div>
      ) : null}

      {strategyId && strategyId > 0 ? (
        <div className="border-t border-border/60 pt-3">
          <p className="text-[12.5px] font-semibold text-foreground">Texts this workflow has sent</p>
          {historyError ? <p className="mt-1 text-[12px] text-destructive">{historyError}</p> : null}
          {history.length === 0 ? (
            <p className="mt-1 text-[12px] text-muted-foreground">No sent email text is recorded for this step yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {history.map((item) => (
                <li key={item.id} className="rounded-md border border-border/60 px-2.5 py-2">
                  <p className="text-[12.5px] font-medium text-foreground">
                    {item.subject || "(no subject)"}
                    {item.is_current_subject ? " · Current" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {[item.origin, item.reminder_stage, item.purpose, item.audience_label]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatWhen(item.first_used_at)} – {formatWhen(item.last_used_at)} ·{" "}
                    {formatRate(item.conversion)} conversion
                    {item.low_sample ? " · Low sample" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
