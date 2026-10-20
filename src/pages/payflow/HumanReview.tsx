import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowReviews } from "../../api/payflow";
import {
  DataTable,
  EmptyState,
  FilterSelect,
  KpiCard,
  PageHeader,
  Panel,
  PrimaryCell,
  SearchInput,
  StatusPill,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
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
    case "On Hold":
      return "warning";
    default:
      return "neutral";
  }
}

function priorityTone(priority: string): Tone {
  if (priority === "High") return "danger";
  if (priority === "Medium") return "warning";
  return "neutral";
}

function isAll(value: string, prefix: string) {
  return !value || value === `All ${prefix}` || value.startsWith("All ");
}

export function PayFlowHumanReview() {
  const [searchParams] = useSearchParams();
  const { isOperationsAdmin } = usePayFlowAccess();
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
  const [actions, setActions] = useState<string[]>([]);
  const [waitingBuckets, setWaitingBuckets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [client, setClient] = useState(searchParams.get("client") || "All Clients");
  const [subClient, setSubClient] = useState("All Sub-Clients");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");
  const [priority, setPriority] = useState(searchParams.get("priority") || "All Priorities");
  const [reason, setReason] = useState("All Reasons");
  const [rule, setRule] = useState("All Rules");
  const [action, setAction] = useState("All Actions");
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
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    listPayflowClients({})
      .then((clientRes) => {
        if (!cancelled) setClients(clientRes.clients || []);
      })
      .catch(() => {
        /* catalog still loads with reviews */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClientId = useMemo(() => {
    if (isAll(client, "Clients")) return undefined;
    return clients.find((c) => c.name === client)?.id;
  }, [client, clients]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const params: Parameters<typeof listPayflowReviews>[0] = {
      page: 1,
      page_size: 200,
    };
    if (selectedClientId != null) params.client_id = selectedClientId;
    if (!isAll(status, "Statuses")) params.status = status;
    if (!isAll(priority, "Priorities")) params.priority = priority;
    if (!isAll(reason, "Reasons")) params.reason = reason;
    if (!isAll(action, "Actions")) params.proposed_action = action;
    if (debouncedSearch) params.search = debouncedSearch;
    if (age && age !== "Any Age") params.waiting_bucket = age;

    listPayflowReviews(params)
      .then((reviewRes) => {
        if (cancelled) return;
        setReviews(reviewRes.reviews || []);
        setSummary(reviewRes.summary);
        setStatuses(reviewRes.statuses || []);
        setPriorities(reviewRes.priorities || []);
        setReasons(reviewRes.reasons || []);
        setActions(reviewRes.proposed_actions || []);
        setWaitingBuckets(reviewRes.waiting_buckets || []);
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
  }, [selectedClientId, status, priority, reason, action, age, debouncedSearch]);

  // Reset sub-client when client changes.
  useEffect(() => {
    setSubClient("All Sub-Clients");
  }, [client]);

  const ruleOptions = useMemo(() => {
    const names = reviews.map((r) => r.rule_name).filter((name): name is string => !!name);
    return ["All Rules", ...Array.from(new Set(names)).sort()];
  }, [reviews]);

  const actionOptions = useMemo(() => {
    if (actions.length) return actions;
    const fromReviews = reviews
      .map((r) => r.proposed_action)
      .filter((name): name is string => !!name);
    return Array.from(new Set(fromReviews)).sort();
  }, [actions, reviews]);

  const subClientOptions = useMemo(() => {
    if (isAll(client, "Clients")) return ["All Sub-Clients"];
    const names = new Set<string>();
    for (const r of reviews) {
      if (r.client_name !== client) continue;
      if (r.portfolio_name) names.add(r.portfolio_name);
    }
    return ["All Sub-Clients", ...[...names].sort()];
  }, [reviews, client]);

  // Rule + sub-client (and client-name fallback) stay client-side.
  const rows = useMemo(() => {
    return reviews.filter((r) => {
      if (
        !isAll(client, "Clients") &&
        selectedClientId == null &&
        r.client_name !== client
      ) {
        return false;
      }
      if (!isAll(rule, "Rules") && r.rule_name !== rule) return false;
      if (!isAll(subClient, "Sub-Clients") && (r.portfolio_name || "") !== subClient) return false;
      return true;
    });
  }, [reviews, client, selectedClientId, rule, subClient]);

  const showSubClient = !isAll(client, "Clients") && subClientOptions.length > 1;

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
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customer, reference or rule"
        />
        <FilterSelect
          label="Client"
          value={client}
          onChange={setClient}
          options={["All Clients", ...clients.map((c) => c.name)]}
        />
        {showSubClient ? (
          <FilterSelect
            label="Sub-Client"
            value={subClient}
            onChange={setSubClient}
            options={subClientOptions}
          />
        ) : null}
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
        <FilterSelect label="Rule" value={rule} onChange={setRule} options={ruleOptions} />
        <FilterSelect
          label="Action"
          value={action}
          onChange={setAction}
          options={["All Actions", ...actionOptions]}
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
          {rows.length === 0 ? (
            <EmptyState
              title="No reviews match these filters"
              description="Human review is an exception queue — an empty queue means automation is operating within governance."
            />
          ) : (
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
          )}

          <Panel className="mt-5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Human review is an exception workspace, not the normal workflow. Routine outcomes —
              partial payments, successful installments, no response, failed payments and
              communication failures — update the customer context and trigger reassessment. A
              review is created only when an evaluated governance rule requires human judgement.
              {!isOperationsAdmin
                ? " You only see reviews for the clients assigned to you."
                : null}
            </p>
          </Panel>
        </>
      ) : null}
    </>
  );
}
