import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getPayflowAccount } from "../../api/payflow";
import {
  PageHeader,
  Panel,
  StatusPill,
  statusTone,
} from "../../components/payflow/lovable/payflow-ui";
import type { PayflowAccount } from "../../types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PayFlowCaseDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<PayflowAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  useEffect(() => {
    const id = Number(accountId);
    if (!Number.isFinite(id)) {
      setError("Account not found");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getPayflowAccount(id)
      .then((res) => {
        if (!cancelled) setAccount(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load account");
          setAccount(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading account…</p>;
  }

  if (error || !account) {
    return (
      <Panel title="No access to this account">
        <p className="text-sm text-muted-foreground">
          {error || "This account either does not exist or is outside your access scope."}
        </p>
        <Link to="/payflow/cases" className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to accounts
        </Link>
      </Panel>
    );
  }

  const facts = [
    { label: "Client", value: account.client_name || "—" },
    { label: "Customer / Customer Account", value: account.customer_name },
    { label: "Account Reference", value: account.account_reference },
    { label: "Collection Case", value: account.case_reference },
    { label: "Original Balance", value: formatCurrency(account.original_balance) },
    { label: "Outstanding Balance", value: formatCurrency(account.outstanding_balance) },
    { label: "Amount Recovered", value: formatCurrency(account.recovered_balance) },
    { label: "Last Action", value: account.last_action || "—" },
    { label: "Next Action", value: account.next_action || "—" },
  ];

  const timeline = account.timeline || [];
  const visibleTimeline = showAllTimeline ? timeline : timeline.slice(0, 6);
  const hiddenCount = Math.max(0, timeline.length - 6);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Accounts / Cases", to: "/payflow/cases" },
          { label: account.client_name || "Client" },
          { label: account.customer_name },
        ]}
        title={account.customer_name}
        description={`Account ${account.account_reference} · Case ${account.case_reference}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill tone={statusTone(account.collection_status)}>
              {account.collection_status}
            </StatusPill>
            {account.human_review ? <StatusPill tone="danger">Human review</StatusPill> : null}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <Panel title="Case Summary">
            <dl className="-mx-1 divide-y divide-border">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-4 px-1 py-2.5">
                  <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                  <dd className="tabular text-[13px] font-medium text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title="Payment"
            description="Payment outcomes from the customer payment experience"
          >
            <p className="text-[13px] text-muted-foreground">
              Payment details will appear here when the Payments module is connected.
            </p>
          </Panel>

          <Panel
            title="Current Workflow"
            description={account.current_workflow || "No workflow assigned"}
          >
            <p className="text-[13px] text-muted-foreground">
              Workflow stage and strategy map will appear with Strategies / Workflows.
            </p>
          </Panel>

          <Panel title="Communications">
            <p className="text-[13px] text-muted-foreground">
              Customer communications for this case will appear with the Communications module.
            </p>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Human Review">
            {account.human_review ? (
              <p className="text-[13px] text-muted-foreground">
                This case is flagged for human review. Review queue details arrive with the Human
                Review module.
              </p>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                No human review items are open for this case.
              </p>
            )}
          </Panel>

          <Panel title="Activity Timeline">
            {visibleTimeline.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {visibleTimeline.map((event, index) => (
                  <li key={`${event.at}-${event.label}-${index}`} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-[13px] font-medium text-foreground">{event.label}</p>
                    <p className="text-[12px] text-muted-foreground">{event.detail}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{event.at}</p>
                  </li>
                ))}
              </ul>
            )}
            {hiddenCount > 0 ? (
              <button
                type="button"
                className="mt-3 text-[13px] font-medium text-primary hover:underline"
                onClick={() => setShowAllTimeline((v) => !v)}
              >
                {showAllTimeline ? "Show fewer events" : `Show ${hiddenCount} more events`}
              </button>
            ) : null}
          </Panel>
        </div>
      </div>
    </>
  );
}
