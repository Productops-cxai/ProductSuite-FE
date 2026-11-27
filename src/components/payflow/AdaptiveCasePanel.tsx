import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  approveAdaptiveDecision,
  getAccountWorkflowExecution,
  listAdaptiveFollowUpTypes,
  modifyAdaptiveDecision,
  rejectAdaptiveDecision,
  reassessWorkflowRun,
} from "../../api/payflow";
import {
  adaptiveTimeline,
  channelPreferenceLabel,
  decidedByLabel,
  decisionActionTitle,
  decisionDetailLines,
  decisionStatusBadge,
  decisionStatusTone,
  expiredReasonLabel,
  formatAdaptiveStamp,
  groupExhausted,
  languageDisplay,
  levelName,
  localDateTimeToIso,
  messageDidNotArrive,
  nextActionSummary,
  primaryDecision,
  typeLabel,
  usageGroups,
  workflowRunEnded,
} from "../../lib/adaptive-workflow";
import type { PayflowCommunicationEligibility, PayflowWorkflowRun } from "../../types";
import type {
  PayflowAdaptiveDecision,
  PayflowAdaptiveFollowUpType,
  PayflowAdaptiveFollowUpUsage,
  PayflowAdaptiveMessage,
  PayflowAdaptiveModifyPayload,
  PayflowAdaptivePreview,
} from "../../types/adaptive";
import {
  Btn,
  Field,
  Panel,
  SelectInput,
  StatusPill,
  TextArea,
  TextInput,
} from "./lovable/payflow-ui";

type ModifyChoice = PayflowAdaptiveModifyPayload["action"];

const MODIFY_CHOICES: { value: ModifyChoice; label: string }[] = [
  { value: "keep_plan", label: "Keep the plan" },
  { value: "use_follow_up", label: "Use a follow-up" },
  { value: "move_next", label: "Move the next message" },
  { value: "switch_channel", label: "Switch channel" },
  { value: "recheck_at", label: "Check again later" },
  { value: "to_operations", label: "Send to Operations" },
];

type Props = {
  accountId: number;
  run: PayflowWorkflowRun | null;
  canEdit: boolean;
  customerLanguage?: string | null;
  emailConsent?: boolean | null;
  eligibility?: PayflowCommunicationEligibility | null;
  onExecution: (run: PayflowWorkflowRun | null) => void;
};

function usageBadge(state?: string | null): { label: string; tone: "success" | "info" | "neutral" | "warning" } {
  switch (state) {
    case "sent":
      return { label: "Sent", tone: "success" };
    case "lined_up":
      return { label: "Scheduled", tone: "info" };
    case "not_written":
      return { label: "Not written yet", tone: "warning" };
    default:
      return { label: "Available", tone: "neutral" };
  }
}

function PreviewBlock({
  preview,
  customerLanguage,
}: {
  preview: PayflowAdaptivePreview;
  customerLanguage?: string | null;
}) {
  const [tab, setTab] = useState<"email" | "sms">(preview.body || preview.subject ? "email" : "sms");
  const language = languageDisplay(preview.language, customerLanguage);
  return (
    <div className="rounded-lg border border-border/70 bg-surface p-3">
      <p className="text-[12px] font-semibold">Preview proposed communication</p>
      <p className="mt-1 text-[11.5px] text-muted-foreground">
        {[preview.version_label, language].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Values in {"{{ }}"} are filled for this customer when the message is sent.
      </p>
      <div className="mt-2 inline-flex rounded-md border border-border bg-muted/40 p-0.5" role="tablist">
        {(["email", "sms"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`rounded px-3 py-1 text-xs font-medium ${
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setTab(key)}
          >
            {key === "email" ? "Email" : "SMS"}
          </button>
        ))}
      </div>
      {tab === "email" ? (
        <div className="mt-2 space-y-1 text-[12.5px]">
          <p className="font-medium">{preview.subject || "No subject"}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{preview.body || "No email text"}</p>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-[12.5px] text-muted-foreground">
          {preview.sms_body || "No SMS text"}
        </p>
      )}
    </div>
  );
}

function MessageCard({
  message,
  types,
  followUps,
}: {
  message: PayflowAdaptiveMessage;
  types: PayflowAdaptiveFollowUpType[];
  followUps: PayflowAdaptiveFollowUpUsage[];
}) {
  const missed = messageDidNotArrive(message.status);
  const usage = followUps.find((row) => row.step_id && row.step_id === message.step_id);
  const followUpFor = message.follow_up_for || usage?.follow_up_for;
  const followUpName = followUpFor
    ? typeLabel(types, followUpFor)
    : (message.title || "Follow-up").replace(/^follow-up:\s*/i, "");
  const title = message.follow_up
    ? `Follow-up: ${followUpName} (${levelName(
        types,
        followUpFor,
        message.follow_up_level ?? usage?.level,
      )})${message.replaced_title ? ` · replaced ${message.replaced_title}` : ""}${
        message.version_label ? ` · ${message.version_label}` : ""
      }`
    : [message.title || "Message", message.version_label].filter(Boolean).join(" · ");
  return (
    <div className={`rounded-md border px-3 py-2 ${missed ? "border-destructive/40" : "border-border/70"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-[12.5px] font-medium ${missed ? "text-destructive" : "text-foreground"}`}>
          {title}
        </p>
        <StatusPill tone={missed ? "danger" : "neutral"}>{message.status || message.channel || "Sent"}</StatusPill>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {[message.channel, formatAdaptiveStamp(message.sent_at)].filter(Boolean).join(" · ")}
      </p>
      {missed ? (
        <p className="mt-1 text-[11px] text-destructive">
          This did not reach the customer and did not use up the follow-up.
        </p>
      ) : null}
    </div>
  );
}

function UsageCell({
  row,
  nextAt,
}: {
  row?: PayflowAdaptiveFollowUpUsage;
  nextAt?: string | null;
}) {
  if (!row) return <span className="text-muted-foreground">—</span>;
  const badge = usageBadge(row.state);
  return (
    <div className="space-y-1">
      <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
      {row.state === "sent" ? (
        <p className="text-[11px] text-muted-foreground">
          {formatAdaptiveStamp(row.sent_at)}
          {row.replaced_title ? ` · Replaced ${row.replaced_title}` : ""}
        </p>
      ) : null}
      {row.state === "lined_up" ? (
        <p className="text-[11px] text-muted-foreground">
          Replaces {row.replaced_title || "the planned message"}
          {nextAt ? ` · ${formatAdaptiveStamp(nextAt)}` : ""}
        </p>
      ) : null}
      {row.state === "available" && row.last_failed ? (
        <p className="text-[11px] text-warning-foreground">Last send failed — still available</p>
      ) : null}
      {row.state === "not_written" ? (
        <p className="text-[11px] text-muted-foreground">Not used until it is written</p>
      ) : null}
    </div>
  );
}

export function AdaptiveCasePanel({
  accountId,
  run,
  canEdit,
  customerLanguage,
  emailConsent,
  eligibility,
  onExecution,
}: Props) {
  const location = useLocation();
  const snapshot = run?.adaptive;
  const [types, setTypes] = useState<PayflowAdaptiveFollowUpType[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [reassessing, setReassessing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [modifying, setModifying] = useState(false);
  const [choice, setChoice] = useState<ModifyChoice>("keep_plan");
  const [followUpStepId, setFollowUpStepId] = useState("");
  const [whenLocal, setWhenLocal] = useState("");
  const [channel, setChannel] = useState<"Email" | "SMS">("Email");

  useEffect(() => {
    let cancelled = false;
    listAdaptiveFollowUpTypes()
      .then((res) => {
        if (!cancelled) setTypes(res.items || []);
      })
      .catch(() => {
        if (!cancelled) setTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (location.hash !== "#adaptive-workflow") return;
    const timer = window.setTimeout(() => {
      document.getElementById("adaptive-workflow")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [location.hash, snapshot, accountId]);

  if (!run || !snapshot) return null;

  async function reload() {
    const res = await getAccountWorkflowExecution(accountId);
    onExecution(res.execution || null);
    return res.execution?.adaptive || null;
  }

  function describeResult(decision: PayflowAdaptiveDecision) {
    if (decision.status === "expired") {
      return `Expired: ${expiredReasonLabel(decision.outcome?.expired_reason)}`;
    }
    if (decision.status === "failed") {
      return `Failed: ${decision.outcome?.error || "It could not be carried out."}`;
    }
    if (decision.status === "approved") return "Approved. The plan keeps running.";
    if (decision.status === "rejected") return "Rejected. The planned message stays as it is.";
    if (decision.status === "modified") return "Changed. The updated decision is on the card.";
    return "Decision updated.";
  }

  async function afterDecision(decision: PayflowAdaptiveDecision) {
    setNotice(describeResult(decision));
    setModifying(false);
    setNote("");
    try {
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "The decision was saved, but the card could not refresh.");
    }
  }

  async function runDecision(kind: "approve" | "reject") {
    const current = primaryDecision(snapshot?.decisions);
    if (!current || current.mode !== "waiting" || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = note.trim() ? { note: note.trim() } : {};
      const updated =
        kind === "approve"
          ? await approveAdaptiveDecision(current.decision.id, payload)
          : await rejectAdaptiveDecision(current.decision.id, payload);
      await afterDecision(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNotice("This decision is no longer waiting. The card has been refreshed.");
        try {
          await reload();
        } catch {
          /* the notice still stands */
        }
      } else {
        setError(err instanceof ApiError ? err.detail : "Could not update the decision.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitModify() {
    const current = primaryDecision(snapshot?.decisions);
    if (!current || current.mode !== "waiting" || busy || !snapshot) return;
    const payload: PayflowAdaptiveModifyPayload = { action: choice };
    if (note.trim()) payload.note = note.trim();
    if (choice === "use_follow_up") {
      if (!snapshot.next_message?.step_id) {
        setError("There is no next message for a follow-up to replace.");
        return;
      }
      if (!followUpStepId) {
        setError("Choose an available follow-up.");
        return;
      }
      payload.follow_up_step_id = followUpStepId;
      payload.replace_step_id = snapshot.next_message.step_id;
    }
    if (choice === "move_next" || choice === "recheck_at") {
      const iso = localDateTimeToIso(whenLocal);
      if (!iso || Date.parse(iso) <= Date.now()) {
        setError("Choose a date and time in the future.");
        return;
      }
      payload.at = iso;
    }
    if (choice === "switch_channel") payload.channel = channel;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await modifyAdaptiveDecision(current.decision.id, payload);
      await afterDecision(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNotice("This decision is no longer waiting. The card has been refreshed.");
        setModifying(false);
        try {
          await reload();
        } catch {
          /* keep the notice */
        }
      } else {
        setError(err instanceof ApiError ? err.detail : "Could not change the decision.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function reassess() {
    if (!run || reassessing || !snapshot) return;
    setReassessing(true);
    setError("");
    setNotice("Reassessing…");
    const startedAt = snapshot.last_reassessed_at || "";
    const startedDecision = snapshot.decisions?.[0]?.id;
    try {
      await reassessWorkflowRun(run.id);
      const deadline = Date.now() + 30_000;
      let latest = snapshot;
      while (Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        latest = (await reload()) || latest;
        const changed =
          (latest.last_reassessed_at || "") !== startedAt ||
          latest.decisions?.[0]?.id !== startedDecision;
        if (changed) break;
      }
      setNotice("Reassessment finished. The latest decision is on the card.");
    } catch (err) {
      setNotice("");
      setError(err instanceof ApiError ? err.detail : "Could not reassess this plan.");
    } finally {
      setReassessing(false);
    }
  }

  if (snapshot.adaptive === false) {
    return (
      <div id="adaptive-workflow" className="scroll-mt-24">
        <Panel title="Adaptive Workflow" description="Adaptive is off for this workflow.">
          <p className="text-[13px] text-muted-foreground">
            This case follows the fixed flowchart. No follow-ups or adaptive decisions apply.
          </p>
        </Panel>
      </div>
    );
  }

  const waitingCount = (snapshot.decisions || []).filter((row) => row.status === "awaiting_approval").length;
  const focus = primaryDecision(snapshot.decisions);
  const next = nextActionSummary(snapshot);
  const available = (snapshot.follow_ups || []).filter((row) => row.state === "available");
  const canUseFollowUp = !!snapshot.next_message?.step_id;
  const choices = MODIFY_CHOICES.filter((item) => item.value !== "use_follow_up" || canUseFollowUp);
  const history = adaptiveTimeline(snapshot);
  const groups = usageGroups(snapshot.follow_ups || []);
  const levelColumns = Array.from(
    new Set(
      (snapshot.follow_ups || [])
        .map((row) => row.level)
        .filter((level): level is number => typeof level === "number"),
    ),
  ).sort((a, b) => a - b);
  const showReassess = !workflowRunEnded(run.status);

  return (
    <div id="adaptive-workflow" className="scroll-mt-24">
      <Panel
        title="Adaptive Workflow"
        description="What happens next for this customer. A waiting decision does not hold the plan."
        action={
          <StatusPill tone={waitingCount ? "warning" : "success"}>
            {waitingCount
              ? `Active · ${waitingCount} decision${waitingCount === 1 ? "" : "s"} waiting`
              : "Active"}
          </StatusPill>
        }
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] text-muted-foreground">Customer engagement</dt>
            <dd className="mt-1 text-[13px] font-medium">{snapshot.engagement_state || "—"}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">Channel</dt>
            <dd className="mt-1 text-[13px] font-medium">{channelPreferenceLabel(snapshot.preferred_channel)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[12px] text-muted-foreground">Next scheduled action</dt>
            <dd className="mt-1 text-[13px] font-medium">
              {next.title}
              {next.when ? ` · ${formatAdaptiveStamp(next.when)}` : ""}
            </dd>
            {waitingCount > 0 ? (
              <p className="mt-1 text-[12px] text-muted-foreground">
                Sent as planned unless the change is approved first.
              </p>
            ) : null}
          </div>
        </dl>

        {notice ? <p className="mt-3 text-[12.5px] text-muted-foreground">{notice}</p> : null}
        {error ? <p className="mt-3 text-[12.5px] text-destructive">{error}</p> : null}

        <div className="mt-4 rounded-lg border border-border/70 p-3">
          {!focus ? (
            <p className="text-[13px] text-muted-foreground">No adaptive change has been recorded yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold">
                  {focus.mode === "waiting" ? "Decision waiting" : "Last change"} ·{" "}
                  {decisionActionTitle(focus.decision.action)}
                </h3>
                <StatusPill tone={decisionStatusTone(focus.decision.status)}>
                  {decisionStatusBadge(focus.decision.status)}
                </StatusPill>
              </div>
              <div className="mt-2 space-y-1 text-[12.5px]">
                {decisionDetailLines(
                  focus.decision,
                  snapshot.preferred_channel,
                  focus.decision.preview
                    ? levelName(types, undefined, focus.decision.preview.level)
                    : null,
                ).map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p className="text-muted-foreground">Source: {decidedByLabel(focus.decision.decided_by)}</p>
                {focus.decision.decided_by === "ai" && focus.decision.confidence != null ? (
                  <p className="text-muted-foreground">Confidence: {focus.decision.confidence}</p>
                ) : null}
                {focus.decision.reason ? <p>Why: {focus.decision.reason}</p> : null}
                <p className="text-muted-foreground">
                  Decided {formatAdaptiveStamp(focus.decision.created_at)}
                  {focus.decision.decided_by_user ? ` · ${focus.decision.decided_by_user}` : ""}
                </p>
                {focus.decision.decision_note ? (
                  <p className="text-muted-foreground">Note: {focus.decision.decision_note}</p>
                ) : null}
                {focus.decision.status === "modified" && focus.decision.outcome?.ai_decision?.action ? (
                  <p className="text-muted-foreground">
                    AI suggested {decisionActionTitle(focus.decision.outcome.ai_decision.action)} · Changed by{" "}
                    {focus.decision.decided_by_user || "Operations"}
                  </p>
                ) : null}
                {focus.decision.status === "expired" ? (
                  <p className="text-warning-foreground">
                    Expired: {expiredReasonLabel(focus.decision.outcome?.expired_reason)}
                  </p>
                ) : null}
                {focus.decision.status === "failed" && focus.decision.outcome?.error ? (
                  <p className="text-destructive">Failed: {focus.decision.outcome.error}</p>
                ) : null}
                <p className="text-[11.5px] text-muted-foreground">
                  Compliance is checked when the message is sent.
                </p>
              </div>
              {(focus.decision.action === "to_operations" || focus.decision.action === "pause") ? (
                <p className="mt-2 text-[12.5px]">
                  The case is in Human Review.
                  {focus.decision.human_review_id || run.human_review_id ? (
                    <Link
                      to={`/payflow/review/${focus.decision.human_review_id || run.human_review_id}`}
                      className="ml-2 font-medium text-primary hover:underline"
                    >
                      Open Human Review
                    </Link>
                  ) : null}
                  <a href="#human-review" className="ml-3 text-primary hover:underline">
                    Human Review card
                  </a>
                </p>
              ) : null}
              {focus.decision.action === "use_follow_up" && focus.decision.preview ? (
                <div className="mt-3">
                  <PreviewBlock preview={focus.decision.preview} customerLanguage={customerLanguage} />
                  <p className="mt-2 text-[11.5px] text-muted-foreground">
                    Email consent: {emailConsent == null ? "—" : emailConsent ? "Yes" : "No"}
                    {eligibility?.email?.eligibility_status
                      ? ` · Email ${eligibility.email.eligibility_status}`
                      : ""}
                    {eligibility?.sms?.eligibility_status ? ` · SMS ${eligibility.sms.eligibility_status}` : ""}
                  </p>
                </div>
              ) : null}
              {focus.mode === "waiting" ? (
                <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                  <p className="text-[12px] text-muted-foreground">
                    AI decision · supervised client · Approve, modify or reject before the planned message is due.
                  </p>
                  <Field label="Note" hint="Optional. Stored with the decision.">
                    <TextArea value={note} onChange={setNote} disabled={!canEdit || busy} rows={2} />
                  </Field>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <Btn variant="primary" disabled={busy} onClick={() => void runDecision("approve")}>
                        Approve
                      </Btn>
                      <Btn disabled={busy} onClick={() => setModifying((open) => !open)}>
                        Modify
                      </Btn>
                      <Btn variant="danger" disabled={busy} onClick={() => void runDecision("reject")}>
                        Reject
                      </Btn>
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">
                      You can view this decision. Changing it needs permission to edit workflows.
                    </p>
                  )}
                  {modifying && canEdit ? (
                    <div className="space-y-3 rounded-lg border border-border/70 p-3">
                      <Field label="Change to">
                        <SelectInput
                          value={choices.find((item) => item.value === choice)?.label || choices[0]!.label}
                          options={choices.map((item) => item.label)}
                          onChange={(label) => {
                            const next = choices.find((item) => item.label === label);
                            if (next) setChoice(next.value);
                          }}
                        />
                      </Field>
                      {choice === "use_follow_up" ? (
                        <Field label="Follow-up" hint="Only follow-ups that are still available.">
                          <SelectInput
                            value={
                              available.find((row) => row.step_id === followUpStepId)?.title ||
                              "Choose a follow-up…"
                            }
                            options={["Choose a follow-up…", ...available.map((row) => row.title || row.step_id)]}
                            onChange={(label) => {
                              const match = available.find((row) => (row.title || row.step_id) === label);
                              setFollowUpStepId(match?.step_id || "");
                            }}
                          />
                        </Field>
                      ) : null}
                      {choice === "move_next" || choice === "recheck_at" ? (
                        <Field label="When">
                          <TextInput type="datetime-local" value={whenLocal} onChange={setWhenLocal} />
                        </Field>
                      ) : null}
                      {choice === "switch_channel" ? (
                        <Field label="Channel">
                          <SelectInput
                            value={channel}
                            options={["Email", "SMS"]}
                            onChange={(value) => setChannel(value === "SMS" ? "SMS" : "Email")}
                          />
                        </Field>
                      ) : null}
                      <Btn variant="primary" disabled={busy} onClick={() => void submitModify()}>
                        {busy ? "Saving…" : "Save change"}
                      </Btn>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-5">
          <h3 className="text-[13px] font-semibold">Follow-up usage</h3>
          {groups.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-muted-foreground">No follow-ups on this workflow.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-[11px] text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Type</th>
                    {levelColumns.map((level) => (
                      <th key={level} className="py-2 pr-3 font-medium">
                        {levelName(types, undefined, level)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((rows) => {
                    const key = rows[0]?.follow_up_for || rows[0]?.step_id;
                    const replacesNext =
                      snapshot.next_message?.step_id &&
                      rows.some(
                        (row) =>
                          row.state === "lined_up" && row.replaced_step_id === snapshot.next_message?.step_id,
                      );
                    return (
                      <tr key={key} className="border-b border-border/60 align-top">
                        <td className="py-3 pr-3">
                          <p className="font-medium">{typeLabel(types, key, rows[0]?.title)}</p>
                          {groupExhausted(rows, types) ? (
                            <span className="mt-1 inline-block">
                              <StatusPill tone="neutral">Exhausted</StatusPill>
                            </span>
                          ) : null}
                        </td>
                        {levelColumns.map((level) => {
                          const row = rows.find((item) => item.level === level);
                          const showTime =
                            !!row &&
                            row.state === "lined_up" &&
                            replacesNext &&
                            row.replaced_step_id === snapshot.next_message?.step_id;
                          return (
                            <td key={level} className="py-3 pr-3">
                              <UsageCell
                                row={row}
                                nextAt={showTime ? snapshot.next_message?.not_before : null}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            First-time content is used the first time; repeat content the next time. Once both have been
            sent, further occurrences are handled by the plan and AI reassessment.
          </p>
        </div>

        <div className="mt-5">
          <h3 className="text-[13px] font-semibold">Engagement and decision history</h3>
          {history.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-muted-foreground">No engagement recorded yet.</p>
          ) : (
            <ol className="mt-2 space-y-2">
              {history.map((entry, index) => (
                <li key={`${entry.kind}-${entry.at}-${index}`} className="rounded-md border border-border/50 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">{formatAdaptiveStamp(entry.at)}</p>
                  {entry.kind === "event" ? (
                    <p className={`mt-1 text-[12.5px] ${entry.muted ? "text-muted-foreground" : "text-foreground"}`}>
                      {entry.text}
                    </p>
                  ) : null}
                  {entry.kind === "decision" ? (
                    <div className="mt-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12.5px] font-medium">
                          {decisionActionTitle(entry.decision.action)}
                        </p>
                        <StatusPill tone={decisionStatusTone(entry.decision.status)}>
                          {decisionStatusBadge(entry.decision.status)}
                        </StatusPill>
                      </div>
                      {entry.decision.reason ? (
                        <p className="text-[12px] text-muted-foreground">{entry.decision.reason}</p>
                      ) : null}
                      <p className="text-[11px] text-muted-foreground">
                        {decidedByLabel(entry.decision.decided_by)}
                        {entry.decision.status === "modified" && entry.decision.outcome?.ai_decision?.action
                          ? ` · AI suggested ${decisionActionTitle(entry.decision.outcome.ai_decision.action)} · Changed by ${
                              entry.decision.decided_by_user || "Operations"
                            }`
                          : ""}
                      </p>
                    </div>
                  ) : null}
                  {entry.kind === "message" ? (
                    <div className="mt-1">
                      <MessageCard
                        message={entry.message}
                        types={types}
                        followUps={snapshot.follow_ups || []}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>

        {showReassess ? (
          <div className="mt-4 border-t border-border/60 pt-3">
            <Btn disabled={!canEdit || reassessing || busy} onClick={() => void reassess()}>
              {reassessing ? "Reassessing…" : "Reassess Plan"}
            </Btn>
            <p className="mt-2 text-[11.5px] text-muted-foreground">
              Ask the AI to look at the latest activity again. The plan keeps running meanwhile.
            </p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
