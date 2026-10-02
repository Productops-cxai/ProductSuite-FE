import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowReviews } from "../../api/payflow";
import {
  DataTable,
  FilterSelect,
  KpiCard,
  PageHeader,
  PrimaryCell,
  SearchInput,
  StatusPill,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import type {
  PayflowClient,
  PayflowReview,
  PayflowReviewsSummary,
} from "../../types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function reviewStatusTone(status: string): Tone {
  switch (status) {
    case "Awaiting Review":
      return "warning";
    case "Approved":
    case "Completed":
      return "success";
    case "Modified":
      return "info";
    case "Rejected":
      return "danger";
    default:
      return "neutral";
  }
}

function priorityTone(priority: string): Tone {
  if (priority === "High") return "danger";
  if (priority === "Medium") return "warning";
  return "neutral";
}

export function PayFlowReviewsPage() {
  const [searchParams] = useSearchParams();
  const [reviews, setReviews] = useState<PayflowReview[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [summary, setSummary] = useState<PayflowReviewsSummary>({
    awaiting: 0,
    high_priority: 0,
    due_today: 0,
    on_hold: 0,
  });
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [waitingBuckets, setWaitingBuckets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [client, setClient] = useState(searchParams.get("client") || "All Clients");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");
  const [priority, setPriority] = useState(searchParams.get("priority") || "All Priorities");
  const [reason, setReason] = useState("All Reasons");
  const [age, setAge] = useState("Any Age");

  useEffect(() => {
    const nextClient = searchParams.get("client");
    const nextStatus = searchParams.get("status");
    const nextPriority = searchParams.get("priority");
    if (nextClient) setClient(nextClient);
    if (nextStatus) setStatus(nextStatus);
    if (nextPriority) setPriority(nextPriority);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([listPayflowReviews({}), listPayflowClients({})])
      .then(([reviewRes, clientRes]) => {
        if (cancelled) return;
        setReviews(reviewRes.reviews || []);
        setSummary(reviewRes.summary);
        setStatuses(reviewRes.statuses || []);
        setPriorities(reviewRes.priorities || []);
        setReasons(reviewRes.reasons || []);
        setWaitingBuckets(reviewRes.waiting_buckets || []);
        setClients(clientRes.clients || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load reviews");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (client !== "All Clients" && r.client_name !== client) return false;
      if (status !== "All Statuses" && r.status !== status) return false;
      if (priority !== "All Priorities" && r.priority !== priority) return false;
      if (reason !== "All Reasons" && r.reason !== reason) return false;
      if (age !== "Any Age") {
        const m = r.waiting_minutes;
        if (age === "Under 30 min" && !(m < 30)) return false;
        if (age === "30 min – 2 hours" && !(m >= 30 && m < 120)) return false;
        if (age === "2 – 24 hours" && !(m >= 120 && m < 1440)) return false;
        if (age === "Over 24 hours" && !(m >= 1440)) return false;
      }
      if (term) {
        const hay = [
          r.customer_name,
          r.account_reference,
          r.reason,
          r.rule_name,
          r.proposed_action,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [reviews, client, status, priority, reason, age, search]);

  return (
    <>
      <PageHeader
        title="Human Review"
        description="Review collection decisions requiring human judgement."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Awaiting Review" value={String(summary.awaiting)} tone="primary" />
        <KpiCard label="High Priority" value={String(summary.high_priority)} />
        <KpiCard label="Due Today" value={String(summary.due_today)} />
        <KpiCard label="On Hold" value={String(summary.on_hold)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search reviews…" />
        <FilterSelect
          label="Client"
          value={client}
          onChange={setClient}
          options={["All Clients", ...clients.map((c) => c.name)]}
        />
        <FilterSelect
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={["All Priorities", ...priorities]}
        />
        <FilterSelect
          label="Reason"
          value={reason}
          onChange={setReason}
          options={["All Reasons", ...reasons]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...statuses]}
        />
        <FilterSelect
          label="Age"
          value={age}
          onChange={setAge}
          options={waitingBuckets.length ? waitingBuckets : ["Any Age"]}
        />
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading reviews…</p> : null}

      {!loading && !error ? (
        <>
          <DataTable
            minWidth={980}
            head={[
              "Priority",
              "Client",
              "Customer",
              "Outstanding",
              "Review Reason",
              "Triggered Rule",
              "Proposed Action",
              "Waiting",
              "Status",
            ]}
          >
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <StatusPill tone={priorityTone(r.priority)}>{r.priority}</StatusPill>
                </Td>
                <Td>
                  <Link
                    to={`/payflow/clients/${r.client_id}`}
                    className="text-muted-foreground hover:underline"
                  >
                    {r.client_name}
                  </Link>
                </Td>
                <Td>
                  <Link to={`/payflow/review/${r.id}`}>
                    <PrimaryCell
                      title={r.customer_name || "—"}
                      subtitle={r.account_reference || undefined}
                    />
                  </Link>
                </Td>
                <Td className="tabular font-medium">
                  {formatCurrency(r.outstanding_balance)}
                </Td>
                <Td className="text-muted-foreground">{r.reason}</Td>
                <Td>
                  {r.rule_id ? (
                    <Link
                      to={`/payflow/rules/${r.rule_id}`}
                      className="text-primary hover:underline"
                    >
                      {r.rule_name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{r.rule_name || "—"}</span>
                  )}
                </Td>
                <Td className="text-muted-foreground">{r.proposed_action}</Td>
                <Td className="tabular text-muted-foreground">
                  {r.waiting_label || `${r.waiting_minutes} min`}
                </Td>
                <Td>
                  <StatusPill tone={reviewStatusTone(r.status)}>{r.status}</StatusPill>
                </Td>
              </Tr>
            ))}
          </DataTable>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No reviews match these filters.</p>
          ) : null}
        </>
      ) : null}
    </>
  );
}
