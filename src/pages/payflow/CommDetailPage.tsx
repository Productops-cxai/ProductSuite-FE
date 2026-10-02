import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getPayflowComm } from "../../api/payflow";
import {
  Btn,
  PageHeader,
  Panel,
  StatusPill,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import type { PayflowCommunication } from "../../types";

function commStatusTone(status: string): Tone {
  switch (status) {
    case "Payment Link Clicked":
      return "success";
    case "Opened / Read":
      return "info";
    case "Delivered":
    case "Sent":
      return "neutral";
    case "Awaiting Governance":
      return "warning";
    case "Failed":
    case "Suppressed":
      return "danger";
    default:
      return "neutral";
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function Expandable({ title, children }: { title: string; children: React.ReactNode }) {
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
      {open && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{children}</p>
      )}
    </div>
  );
}

export function PayFlowCommDetailPage() {
  const { communicationId } = useParams<{ communicationId: string }>();
  const [comm, setComm] = useState<PayflowCommunication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const id = Number(communicationId);
    if (!Number.isFinite(id)) {
      setError("Communication not found");
      setLoading(false);
      return;
    }
    setLoading(true);
    getPayflowComm(id)
      .then((row) => {
        if (!cancelled) setComm(row);
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
  }, [communicationId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading communication…</p>;
  if (error && !comm) {
    return (
      <Panel title="Communication not available">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link
          to="/payflow/comms"
          className="mt-3 inline-block text-[13px] font-medium text-primary"
        >
          Back to communications
        </Link>
      </Panel>
    );
  }
  if (!comm) return null;

  const brandName = comm.brand_name || comm.client_name || "Collections";
  const facts = [
    { label: "Client", value: comm.client_name || "—" },
    { label: "Customer", value: comm.customer_name || "—" },
    { label: "Account Reference", value: comm.account_reference || "—" },
    { label: "Collection Case", value: comm.case_reference || "—" },
    { label: "Channel", value: comm.channel },
    { label: "Purpose", value: comm.purpose },
    { label: "Workflow", value: comm.workflow_name || "—" },
    { label: "Status", value: comm.status },
    {
      label: "Created",
      value: [comm.date_label, comm.time_label].filter(Boolean).join(" ") || "—",
    },
    { label: "Engagement", value: comm.engagement || "Not trackable" },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Communications", to: "/payflow/comms" },
          { label: comm.customer_name || "Customer" },
          { label: comm.code },
        ]}
        title={`${comm.channel} · ${comm.purpose}`}
        description={`${comm.customer_name || "Customer"} · ${comm.account_reference || "—"} · ${[
          comm.date_label,
          comm.time_label,
        ]
          .filter(Boolean)
          .join(" ")}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={commStatusTone(comm.status)}>{comm.status}</StatusPill>
            <StatusPill>{comm.code}</StatusPill>
          </div>
        }
      />

      {comm.review_id != null && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-[13px] text-foreground">
            Governance requires a supervisor decision before this communication can be sent.
          </p>
          <Link to={`/payflow/review/${comm.review_id}`}>
            <Btn variant="primary">Open Human Review</Btn>
          </Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <Panel title="Communication Summary" bodyClassName="p-0">
            <dl className="divide-y divide-border">
              {facts.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between gap-4 px-4 py-2.5"
                >
                  <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                  <dd className="tabular text-[13px] font-medium text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Why this communication" bodyClassName="px-5 py-1">
            <Expandable title="Why this message?">
              {comm.why_message || "No rationale recorded."}
            </Expandable>
            <Expandable title={`Why ${comm.channel}?`}>
              {comm.why_channel || "No channel rationale recorded."}
            </Expandable>
            <Expandable title="Why now?">
              {comm.why_timing || "No timing rationale recorded."}
            </Expandable>
          </Panel>

          <Panel title="Linked records" bodyClassName="p-0">
            <ul className="divide-y divide-border text-[13px]">
              <li className="px-4 py-2.5">
                <Link
                  to={`/payflow/cases/${comm.account_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  Open collection case · {comm.account_reference || `#${comm.account_id}`}
                </Link>
              </li>
              {comm.workflow_name && (
                <li className="px-4 py-2.5">
                  <Link
                    to="/payflow/workflows"
                    className="font-medium text-primary hover:underline"
                  >
                    View workflows · {comm.workflow_name}
                  </Link>
                </li>
              )}
              <li className="px-4 py-2.5">
                <Link
                  to={`/payflow/clients/${comm.client_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  View client · {comm.client_name || `#${comm.client_id}`}
                </Link>
              </li>
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Message Preview" description="The communication as the customer sees it">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="bg-slate-900 px-4 py-3 text-white">
                <p className="text-[13px] font-semibold">{brandName}</p>
                {comm.subject && (
                  <p className="mt-0.5 text-[11px] opacity-90">{comm.subject}</p>
                )}
                {comm.channel === "SMS" && comm.sms_sender_id && (
                  <p className="mt-0.5 text-[11px] opacity-80">From {comm.sms_sender_id}</p>
                )}
                {comm.channel === "Email" && comm.email_from && (
                  <p className="mt-0.5 text-[11px] opacity-80">{comm.email_from}</p>
                )}
              </div>
              <div className="space-y-3 bg-card px-4 py-4">
                {(comm.body_lines || []).map((line, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-foreground">
                    {line}
                  </p>
                ))}
                {(comm.body_lines || []).length === 0 && (
                  <p className="text-[13px] text-muted-foreground">No message body recorded.</p>
                )}
                <div className="rounded-md border border-border bg-surface px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Outstanding Balance</p>
                  <p className="tabular text-[16px] font-semibold text-foreground">
                    {formatCurrency(comm.balance)}
                  </p>
                </div>
                {comm.payment_link && (
                  <div>
                    <span className="inline-flex items-center rounded-md bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground">
                      Pay Now
                    </span>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Unique secure payment link · opens the {brandName}-branded customer payment
                      experience
                    </p>
                  </div>
                )}
                <p className="text-[12px] text-muted-foreground">
                  {comm.sender_name || `${brandName} Collections`}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Delivery & Engagement Events">
            <ol className="relative space-y-3.5 pl-5">
              <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" />
              {(comm.events || []).map((e, i) => (
                <li key={`${e.label}-${i}`} className="relative">
                  <span className="absolute top-1 -left-5 size-[11px] rounded-full border-2 border-card bg-primary/70" />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-medium text-foreground">{e.label}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{e.at}</span>
                  </div>
                  {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                </li>
              ))}
            </ol>
            {(comm.events || []).length === 0 && (
              <p className="text-[12.5px] text-muted-foreground">No delivery events recorded yet.</p>
            )}
            {!comm.engagement && (
              <p className="mt-3 rounded-md border border-dashed border-border-strong bg-surface px-3 py-2 text-xs text-muted-foreground">
                Open / read tracking is not available for this send, so engagement is reported as
                not trackable rather than assumed.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
