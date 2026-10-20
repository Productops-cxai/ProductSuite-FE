import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getPayflowComm, resendPayflowCommunication } from "../../api/payflow";
import {
  Btn,
  PageHeader,
  Panel,
  StatusPill,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { cn } from "../../lib/utils";
import type { PayflowCommunication } from "../../types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStamp(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function commStatusTone(status: string): Tone {
  switch (status) {
    case "Payment Link Clicked":
      return "success";
    case "Opened / Read":
      return "info";
    case "Delivered":
    case "Sent":
      return "neutral";
    case "Queued":
    case "Awaiting Governance":
    case "Scheduled":
    case "Prepared":
      return "warning";
    case "Failed":
    case "Suppressed":
      return "danger";
    default:
      return "neutral";
  }
}

function engagementLabel(c: PayflowCommunication) {
  if (c.engagement_tracking === "not_available") return "Not available";
  if (c.engagement == null || c.engagement === "") return "Not trackable";
  return c.engagement;
}

function eligibilityTone(status?: string | null): Tone {
  switch (status) {
    case "Eligible":
      return "success";
    case "Blocked":
    case "Failed":
      return "danger";
    case "Deferred":
    case "Scheduled":
      return "warning";
    default:
      return "neutral";
  }
}

function Expandable({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border py-2.5 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[13px] font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{children}</p>
      ) : null}
    </div>
  );
}

export function PayFlowCommDetailPage() {
  const { communicationId } = useParams<{ communicationId: string }>();
  const { hasPermission } = usePayFlowAccess();
  const [comm, setComm] = useState<PayflowCommunication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const id = Number(communicationId);
    if (!Number.isFinite(id)) {
      setError("Communication not found");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPayflowComm(id)
      .then((res) => {
        if (!cancelled) setComm(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load communication");
          setComm(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [communicationId, reloadTick]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading communication…</p>;
  }

  if (error || !comm) {
    return (
      <Panel title="Communication not found">
        <p className="text-sm text-muted-foreground">
          {error || "This communication could not be loaded."}
        </p>
        <Link to="/payflow/comms" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to communications
        </Link>
      </Panel>
    );
  }

  const brandName = comm.brand_name || comm.client_name || "PayFlow";
  const senderName = comm.sender_name || brandName;
  const payLink = comm.payment_link ? comm.payment_link_url : null;
  const sentLabel =
    comm.status === "Prepared" ||
    comm.status === "Awaiting Governance" ||
    comm.status === "Scheduled"
      ? "Not sent"
      : comm.status === "Queued"
        ? [comm.date_label, comm.time_label].filter(Boolean).join(" ") ||
          formatStamp(comm.sent_at || comm.created_at)
        : [comm.date_label, comm.time_label].filter(Boolean).join(" ") ||
          formatStamp(comm.sent_at || comm.created_at);

  const facts = [
    { label: "Client", value: comm.client_name || "—" },
    { label: "Customer", value: comm.customer_name || "—" },
    { label: "Account Reference", value: comm.account_reference || "—" },
    { label: "Collection Case", value: comm.case_status || "—" },
    { label: "Channel", value: comm.channel },
    { label: "Recipient", value: comm.recipient || "—" },
    { label: "Purpose", value: comm.purpose },
    { label: "Workflow", value: comm.workflow_name || "—" },
    { label: "Status", value: comm.status },
    { label: "Created", value: formatStamp(comm.created_at) },
    { label: "Sent", value: sentLabel },
    { label: "Delivered", value: formatStamp(comm.delivered_at) },
    { label: "Engagement", value: engagementLabel(comm) },
    ...(comm.provider_error
      ? [{ label: "Failure reason", value: comm.provider_error }]
      : []),
  ];

  const engagementFacts = [
    { label: "Opens", value: String(comm.opens_count ?? 0) },
    { label: "Clicks", value: String(comm.clicks_count ?? 0) },
    { label: "First opened", value: formatStamp(comm.first_opened_at) },
    { label: "Last opened", value: formatStamp(comm.last_opened_at) },
    { label: "First clicked", value: formatStamp(comm.first_clicked_at) },
    { label: "Last clicked", value: formatStamp(comm.last_clicked_at) },
    { label: "Last clicked URL", value: comm.last_clicked_url || "—" },
    {
      label: "Days since delivery without open",
      value:
        comm.days_since_delivery_without_open != null
          ? String(comm.days_since_delivery_without_open)
          : "—",
    },
    {
      label: "Days since delivery without click",
      value:
        comm.days_since_delivery_without_click != null
          ? String(comm.days_since_delivery_without_click)
          : "—",
    },
    { label: "Payment initiated", value: comm.payment_initiated ? "Yes" : "No" },
    { label: "Payment completed", value: comm.payment_completed ? "Yes" : "No" },
  ];

  const showEligibility =
    Boolean(comm.eligibility_status) ||
    Boolean(comm.restriction_reason) ||
    Boolean(comm.rule_id) ||
    ["Awaiting Governance", "Suppressed", "Failed", "Scheduled"].includes(comm.status);

  const canResend =
    hasPermission("send_communications") && comm.status === "Failed";

  async function handleResend() {
    if (!comm || !canResend || resending) return;
    setResending(true);
    setResendMsg("");
    try {
      const res = await resendPayflowCommunication(comm.id, {
        idempotency_key: `resend-${comm.id}-${Date.now()}`,
      });
      if (res.restriction_reason) {
        setResendMsg(res.restriction_reason);
      } else if (res.provider_error) {
        setResendMsg(res.provider_error);
      } else if (res.communication_id) {
        setResendMsg(`Resent as ${res.code || `#${res.communication_id}`}`);
      }
      setReloadTick((n) => n + 1);
    } catch (err) {
      setResendMsg(err instanceof ApiError ? err.detail : "Resend failed");
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Communications", to: "/payflow/comms" },
          { label: comm.customer_name || "Customer" },
          { label: comm.code },
        ]}
        title={`${comm.channel} · ${comm.purpose}`}
        description={`${comm.customer_name || "Customer"} · ${comm.account_reference || "—"} · ${[comm.date_label, comm.time_label].filter(Boolean).join(" ") || "—"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={commStatusTone(comm.status)}>{comm.status}</StatusPill>
            <StatusPill>{comm.code}</StatusPill>
            {canResend ? (
              <Btn variant="secondary" disabled={resending} onClick={() => void handleResend()}>
                {resending ? "Resending…" : "Resend"}
              </Btn>
            ) : null}
            {payLink ? (
              <a href={payLink} target="_blank" rel="noreferrer">
                <Btn variant="primary">Preview Payment Experience</Btn>
              </a>
            ) : null}
          </div>
        }
      />

      {resendMsg ? (
        <p className="mb-4 text-[13px] text-muted-foreground">{resendMsg}</p>
      ) : null}

      {comm.review_id ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-[13px] text-foreground">
            Governance requires a supervisor decision before this communication can be sent.
          </p>
          <Link to={`/payflow/review/${comm.review_id}`}>
            <Btn variant="primary">Open Human Review</Btn>
          </Link>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <Panel title="Communication Summary" bodyClassName="p-0">
            <dl className="divide-y divide-border">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                  <dd className="tabular text-[13px] font-medium text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Why this communication" bodyClassName="px-5 py-1">
            <Expandable title="Why this message?">
              {comm.why_message || "No explanation recorded."}
            </Expandable>
            <Expandable title={`Why ${comm.channel}?`}>
              {comm.why_channel || "No explanation recorded."}
            </Expandable>
            <Expandable title="Why now?">
              {comm.why_timing || "No explanation recorded."}
            </Expandable>
          </Panel>

          {showEligibility ? (
            <Panel
              title="Eligibility & governance"
              description="Whether this send was allowed, deferred, or blocked by rules"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {comm.eligibility_status ? (
                  <StatusPill tone={eligibilityTone(comm.eligibility_status)}>
                    {comm.eligibility_status}
                  </StatusPill>
                ) : null}
                {comm.next_eligible_at ? (
                  <span className="text-[12px] text-muted-foreground">
                    Next eligible · {formatStamp(comm.next_eligible_at)}
                  </span>
                ) : null}
              </div>
              {comm.restriction_reason ? (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-foreground">
                  {comm.restriction_reason}
                </p>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  No restriction reason recorded for this communication.
                </p>
              )}
              {comm.rule_id && comm.can_view_rule ? (
                <Link
                  to={`/payflow/rules/${comm.rule_id}`}
                  className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline"
                >
                  View rule · {comm.rule_name || comm.rule_code || `#${comm.rule_id}`}
                </Link>
              ) : null}
              {comm.rule_name && !comm.can_view_rule ? (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Rule · {comm.rule_name}
                  {comm.rule_code ? ` (${comm.rule_code})` : ""}
                </p>
              ) : null}
            </Panel>
          ) : null}

          <Panel title="Linked records" bodyClassName="p-0">
            <ul className="divide-y divide-border text-[13px]">
              <li className="px-4 py-2.5">
                <Link
                  to={`/payflow/cases/${comm.account_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  Open collection case · {comm.account_reference || comm.case_reference || "—"}
                </Link>
              </li>
              {comm.workflow_name ? (
                <li className="px-4 py-2.5">
                  <Link
                    to={`/payflow/workflows?client=${encodeURIComponent(comm.client_name || "")}`}
                    className="font-medium text-primary hover:underline"
                  >
                    View workflow · {comm.workflow_name}
                  </Link>
                </li>
              ) : null}
              <li className="px-4 py-2.5">
                <Link
                  to={`/payflow/clients/${comm.client_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  View client · {comm.client_name || "—"}
                </Link>
              </li>
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Message Preview" description="The communication as the customer sees it">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="bg-primary px-4 py-3 text-primary-foreground">
                <p className="text-[13px] font-semibold">{brandName}</p>
                {comm.subject ? (
                  <p className="mt-0.5 text-[11px] opacity-90">{comm.subject}</p>
                ) : null}
              </div>
              <div className="space-y-3 bg-card px-4 py-4">
                {(comm.body_lines || []).map((line, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-foreground">
                    {line}
                  </p>
                ))}
                <div className="rounded-md border border-border bg-surface px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Outstanding Balance</p>
                  <p className="tabular text-[16px] font-semibold text-foreground">
                    {formatCurrency(comm.balance)}
                  </p>
                </div>
                {comm.payment_link ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={payLink || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "inline-flex items-center rounded-md bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground",
                          !payLink && "pointer-events-none opacity-60",
                        )}
                      >
                        Pay Now
                      </a>
                      {payLink ? (
                        <Btn
                          variant="secondary"
                          onClick={() => {
                            void navigator.clipboard.writeText(payLink).then(() => {
                              setCopiedLink(true);
                              window.setTimeout(() => setCopiedLink(false), 1600);
                            });
                          }}
                        >
                          {copiedLink ? "Copied" : "Copy link"}
                        </Btn>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Link unavailable (expired or revoked)
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Unique secure payment link · opens the branded customer payment portal at
                      /pay/…
                    </p>
                  </div>
                ) : null}
                <p className="text-[12px] text-muted-foreground">
                  {senderName}
                  {comm.email_from && comm.channel === "Email" ? ` · ${comm.email_from}` : ""}
                  {comm.sms_sender_id && comm.channel === "SMS" ? ` · ${comm.sms_sender_id}` : ""}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Engagement metrics" bodyClassName="p-0">
            <dl className="divide-y divide-border">
              {engagementFacts.map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                  <dd className="max-w-[55%] truncate text-right tabular text-[13px] font-medium text-foreground">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
            {comm.engagement_tracking === "not_available" ||
            comm.engagement == null ||
            comm.engagement === "" ? (
              <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                Open / read tracking is not available for this send, so engagement is reported as not
                available rather than assumed.
              </p>
            ) : null}
          </Panel>

          <Panel title="Delivery & Engagement Events">
            {(comm.events || []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No delivery events recorded yet.</p>
            ) : (
              <ol className="relative space-y-3.5 pl-5">
                <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" />
                {(comm.events || []).map((e, i) => (
                  <li key={`${e.label}-${i}`} className="relative">
                    <span className="absolute top-1 -left-5 size-[11px] rounded-full border-2 border-card bg-primary/70" />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-medium text-foreground">{e.label}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatStamp(e.at)}
                      </span>
                    </div>
                    {e.detail ? <p className="text-xs text-muted-foreground">{e.detail}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
