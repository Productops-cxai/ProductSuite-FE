import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  listPayflowAccounts,
  listPayflowComms,
  listPayflowReviews,
  listPayflowRules,
  listPayflowWorkflows,
} from "../../api/payflow";
import {
  DataTable,
  EmptyState,
  Panel,
  StatusPill,
  Td,
  Tr,
  statusTone,
  type Tone,
} from "./lovable/payflow-ui";
import type {
  PayflowAccount,
  PayflowCommunication,
  PayflowReview,
  PayflowRule,
  PayflowStrategy,
} from "../../types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function strategyStatusTone(status: string): Tone {
  switch (status) {
    case "AI Proposed":
      return "ai";
    case "Under Review":
      return "warning";
    case "Approved":
      return "info";
    case "Active":
      return "success";
    default:
      return "neutral";
  }
}

function ruleStatusTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "Draft") return "warning";
  return "neutral";
}

function reviewStatusTone(status: string): Tone {
  if (status === "Awaiting Review") return "warning";
  if (status === "Approved" || status === "Completed") return "success";
  if (status === "Rejected") return "danger";
  return "neutral";
}

export function ClientAccountsTab({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  const [rows, setRows] = useState<PayflowAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayflowAccounts({ client_id: clientId })
      .then((res) => {
        if (!cancelled) setRows(res.accounts || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load accounts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <Panel
      title="Accounts"
      description={`Customer accounts under collection for ${clientName}`}
      action={
        <Link to={`/payflow/cases?client=${encodeURIComponent(clientName)}`} className="text-[12.5px] font-semibold text-primary hover:underline">
          Open Accounts / Cases
        </Link>
      }
    >
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading accounts…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Accounts appear here after the first CRM file sync for this client."
        />
      ) : null}
      {!loading && rows.length > 0 ? (
        <DataTable
          minWidth={900}
          head={[
            "Customer",
            "Account Reference",
            "Outstanding",
            "Collection Status",
            "Current Workflow",
            "Human Review",
          ]}
        >
          {rows.map((a) => (
            <Tr key={a.id}>
              <Td>
                <Link to={`/payflow/cases/${a.id}`} className="font-medium text-foreground hover:underline">
                  {a.customer_name}
                </Link>
              </Td>
              <Td className="tabular text-muted-foreground">{a.account_reference}</Td>
              <Td className="tabular font-medium">{formatCurrency(a.outstanding_balance)}</Td>
              <Td>
                <StatusPill tone={statusTone(a.collection_status)}>{a.collection_status}</StatusPill>
              </Td>
              <Td className="text-muted-foreground">{a.current_workflow || "—"}</Td>
              <Td>{a.human_review ? <StatusPill tone="warning">Yes</StatusPill> : "—"}</Td>
            </Tr>
          ))}
        </DataTable>
      ) : null}
    </Panel>
  );
}

export function ClientWorkflowsTab({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  const [rows, setRows] = useState<PayflowStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayflowWorkflows({ client_id: clientId })
      .then((res) => {
        if (!cancelled) setRows(res.strategies || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load workflows");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <Panel
      title="Workflows"
      description={`Global workflows in use by ${clientName} and ${clientName}-specific workflows`}
      action={
        <Link to="/payflow/workflows" className="text-[12.5px] font-semibold text-primary hover:underline">
          All workflows
        </Link>
      }
    >
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading workflows…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No workflows yet"
          description="AI-proposed and human-created strategies for this client will show here."
        />
      ) : null}
      {!loading && rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                to={`/payflow/workflows/${s.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{s.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {s.portfolio_name || "Client-level"} · {s.origin} · v{s.version}
                  </p>
                </div>
                <StatusPill tone={strategyStatusTone(s.status)} dot>
                  {s.status}
                </StatusPill>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

export function ClientCommunicationsTab({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  const [rows, setRows] = useState<PayflowCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayflowComms({ client_id: clientId })
      .then((res) => {
        if (!cancelled) setRows(res.communications || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load communications");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const preview = useMemo(() => rows.slice(0, 25), [rows]);

  return (
    <Panel
      title="Communications"
      description={`Customer communications sent for ${clientName} accounts`}
      action={
        <Link to="/payflow/comms" className="text-[12.5px] font-semibold text-primary hover:underline">
          Full communication log
        </Link>
      }
    >
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading communications…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No communications yet"
          description="Outbound reminders and payment links for this client will appear here."
        />
      ) : null}
      {!loading && preview.length > 0 ? (
        <DataTable minWidth={820} head={["Customer", "Channel", "Purpose", "Status", "When", ""]}>
          {preview.map((c) => (
            <Tr key={c.id}>
              <Td className="font-medium">{c.customer_name || "—"}</Td>
              <Td>{c.channel}</Td>
              <Td className="text-muted-foreground">{c.purpose}</Td>
              <Td>
                <StatusPill>{c.status}</StatusPill>
              </Td>
              <Td className="text-muted-foreground">
                {[c.date_label, c.time_label].filter(Boolean).join(" · ") || "—"}
              </Td>
              <Td>
                <Link to={`/payflow/comms/${c.id}`} className="text-[12.5px] font-semibold text-primary hover:underline">
                  View
                </Link>
              </Td>
            </Tr>
          ))}
        </DataTable>
      ) : null}
    </Panel>
  );
}

export function ClientRulesTab({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  const [rows, setRows] = useState<PayflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayflowRules({ client_id: clientId })
      .then((res) => {
        if (!cancelled) {
          const list = res.rules || [];
          setRows(
            list.filter(
              (r) =>
                r.rule_type === "System Rule" ||
                r.client_id === clientId ||
                r.client_name === clientName,
            ),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load rules");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, clientName]);

  return (
    <Panel
      title="Rules"
      description={`System and client rules applying to ${clientName}`}
      action={
        <Link to="/payflow/rules" className="text-[12.5px] font-semibold text-primary hover:underline">
          All rules
        </Link>
      }
    >
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading rules…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No rules yet" description="Rules that govern collection behaviour for this client will show here." />
      ) : null}
      {!loading && rows.length > 0 ? (
        <DataTable minWidth={780} head={["Rule", "Type", "Category", "Status", ""]}>
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td className="font-medium">{r.name}</Td>
              <Td className="text-muted-foreground">{r.rule_type}</Td>
              <Td className="text-muted-foreground">{r.category}</Td>
              <Td>
                <StatusPill tone={ruleStatusTone(r.status)}>{r.status}</StatusPill>
              </Td>
              <Td>
                <Link to={`/payflow/rules/${r.id}`} className="text-[12.5px] font-semibold text-primary hover:underline">
                  View
                </Link>
              </Td>
            </Tr>
          ))}
        </DataTable>
      ) : null}
    </Panel>
  );
}

export function ClientReviewsTab({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  const [rows, setRows] = useState<PayflowReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayflowReviews({ client_id: clientId })
      .then((res) => {
        if (!cancelled) setRows(res.reviews || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load reviews");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <Panel
      title="Human Reviews"
      description={`Exceptions from ${clientName} awaiting a supervisor decision`}
      action={
        <Link to="/payflow/review" className="text-[12.5px] font-semibold text-primary hover:underline">
          Open review queue
        </Link>
      }
    >
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading reviews…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No reviews for this client"
          description="Human review exceptions raised for this client will appear here."
        />
      ) : null}
      {!loading && rows.length > 0 ? (
        <DataTable minWidth={860} head={["Customer", "Reason", "Priority", "Status", "Waiting", ""]}>
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td className="font-medium">{r.customer_name}</Td>
              <Td className="text-muted-foreground">{r.reason}</Td>
              <Td>
                <StatusPill tone={r.priority === "High" ? "danger" : "neutral"}>{r.priority}</StatusPill>
              </Td>
              <Td>
                <StatusPill tone={reviewStatusTone(r.status)}>{r.status}</StatusPill>
              </Td>
              <Td className="text-muted-foreground">{r.waiting_label || "—"}</Td>
              <Td>
                <Link to={`/payflow/review/${r.id}`} className="text-[12.5px] font-semibold text-primary hover:underline">
                  Review
                </Link>
              </Td>
            </Tr>
          ))}
        </DataTable>
      ) : null}
    </Panel>
  );
}
