import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowComms } from "../../api/payflow";
import {
  Btn,
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
import type {
  PayflowClient,
  PayflowCommunication,
  PayflowCommunicationsSummary,
} from "../../types";

const DATE_RANGES = ["Today", "Yesterday", "Last 7 Days", "This Month"];
const PAGE_SIZE = 50;

const EMPTY_SUMMARY: PayflowCommunicationsSummary = {
  sent_today: 0,
  delivered: 0,
  engaged: 0,
  clicks: 0,
  failed: 0,
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dateRangeToParams(date: string): { date_from?: string; date_to?: string } {
  if (date === "All Dates") return {};
  const now = new Date();
  if (date === "Today") {
    return { date_from: startOfDay(now).toISOString(), date_to: endOfDay(now).toISOString() };
  }
  if (date === "Yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { date_from: startOfDay(y).toISOString(), date_to: endOfDay(y).toISOString() };
  }
  if (date === "Last 7 Days") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { date_from: startOfDay(from).toISOString(), date_to: endOfDay(now).toISOString() };
  }
  if (date === "This Month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { date_from: startOfDay(from).toISOString(), date_to: endOfDay(now).toISOString() };
  }
  return {};
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

export function PayFlowCommsPage() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<PayflowCommunication[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [summary, setSummary] = useState<PayflowCommunicationsSummary>(EMPTY_SUMMARY);
  const [dropOff, setDropOff] = useState<Record<string, number>>({});
  const [dropOffSegments, setDropOffSegments] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [date, setDate] = useState("All Dates");
  const [client, setClient] = useState(searchParams.get("client") || "All Clients");
  const [channel, setChannel] = useState(searchParams.get("channel") || "All Channels");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");
  const [workflow, setWorkflow] = useState(
    searchParams.get("journey") || searchParams.get("workflow") || "All Workflows",
  );
  const [purpose, setPurpose] = useState("All Purposes");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const nextStatus = searchParams.get("status");
    const nextChannel = searchParams.get("channel");
    const nextClient = searchParams.get("client");
    const nextWorkflow = searchParams.get("journey") || searchParams.get("workflow");
    if (nextStatus) setStatus(nextStatus);
    if (nextChannel) setChannel(nextChannel);
    if (nextClient) setClient(nextClient);
    if (nextWorkflow) setWorkflow(nextWorkflow);
  }, [searchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery, date, client, channel, status, workflow, purpose]);

  useEffect(() => {
    let cancelled = false;
    listPayflowClients({})
      .then((res) => {
        if (!cancelled) setClients(res.clients || []);
      })
      .catch(() => {
        /* keep empty clients; filters still work without names */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClientId = useMemo(() => {
    if (client === "All Clients") return undefined;
    const match = clients.find((c) => c.name === client);
    return match?.id;
  }, [client, clients]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const range = dateRangeToParams(date);
    listPayflowComms({
      client_id: selectedClientId,
      status: status !== "All Statuses" ? status : undefined,
      channel: channel !== "All Channels" ? channel : undefined,
      purpose: purpose !== "All Purposes" ? purpose : undefined,
      workflow: workflow !== "All Workflows" ? workflow : undefined,
      search: debouncedQuery.trim() || undefined,
      date_from: range.date_from,
      date_to: range.date_to,
      limit: PAGE_SIZE,
      offset,
    })
      .then((commRes) => {
        if (cancelled) return;
        setRows(commRes.communications || []);
        setSummary(commRes.summary || EMPTY_SUMMARY);
        setDropOff(commRes.drop_off || {});
        setDropOffSegments(commRes.drop_off_segments || []);
        setStatuses(commRes.statuses || []);
        setChannels(commRes.channels || []);
        setPurposes(commRes.purposes || []);
        setWorkflows(commRes.workflows || []);
        setTotal(commRes.total ?? (commRes.communications || []).length);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load communications");
          setRows([]);
          setSummary(EMPTY_SUMMARY);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedClientId,
    status,
    channel,
    purpose,
    workflow,
    debouncedQuery,
    date,
    offset,
  ]);

  const segments =
    dropOffSegments.length > 0
      ? dropOffSegments
      : [
          "Delivered but Not Opened / Read",
          "Opened / Read but Did Not Click",
          "Clicked but Did Not Initiate Payment",
        ];

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + rows.length, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <>
      <PageHeader
        title="Communications"
        description="Monitor customer collection communications across Clients and channels."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Sent Today" value={String(summary.sent_today)} />
        <KpiCard label="Delivered" value={String(summary.delivered)} />
        <KpiCard label="Engaged" value={String(summary.engaged)} />
        <KpiCard label="Payment Link Clicks" value={String(summary.clicks)} tone="primary" />
        <KpiCard label="Failed" value={String(summary.failed)} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Drop-off
        </span>
        {segments.map((segment) => (
          <StatusPill key={segment}>
            {segment} · {dropOff[segment] ?? 0}
          </StatusPill>
        ))}
      </div>

      <Panel
        title="Communication Log"
        description="Every communication belongs to a client, customer account, collection case and workflow. KPIs above reflect the current filters."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Customer, account reference or ID"
            className="w-64"
          />
          <FilterSelect
            label="Date"
            value={date}
            onChange={setDate}
            options={["All Dates", ...DATE_RANGES]}
          />
          <FilterSelect
            label="Client"
            value={client}
            onChange={setClient}
            options={["All Clients", ...clients.map((c) => c.name)]}
          />
          <FilterSelect
            label="Channel"
            value={channel}
            onChange={setChannel}
            options={["All Channels", ...(channels.length ? channels : ["Email", "SMS"])]}
          />
          <span
            className="flex h-8 cursor-not-allowed items-center gap-2 rounded-md border border-border bg-surface px-2.5 opacity-60"
            title="WhatsApp is coming later"
          >
            <span className="text-[11px] font-medium text-muted-foreground">Channel</span>
            <span className="text-[13px] font-medium text-muted-foreground">
              WhatsApp · coming later
            </span>
          </span>
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={["All Statuses", ...statuses]}
          />
          <FilterSelect
            label="Workflow"
            value={workflow}
            onChange={setWorkflow}
            options={["All Workflows", ...workflows]}
          />
          <FilterSelect
            label="Purpose"
            value={purpose}
            onChange={setPurpose}
            options={["All Purposes", ...purposes]}
          />
        </div>

        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading communications…</p> : null}

        {!loading && !error && rows.length === 0 ? (
          <EmptyState
            title="No communications match these filters"
            description="Adjust the search or filters to see customer communications."
          />
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <>
            <DataTable
              minWidth={1100}
              head={[
                "Time",
                "Client",
                "Customer",
                "Account",
                "Channel",
                "Purpose",
                "Workflow",
                "Status",
                "Engagement",
              ]}
            >
              {rows.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link to={`/payflow/comms/${c.id}`}>
                      <PrimaryCell
                        title={
                          <span className="tabular text-primary hover:underline">
                            {c.time_label || "—"}
                          </span>
                        }
                        subtitle={c.date_label || c.code}
                      />
                    </Link>
                  </Td>
                  <Td>{c.client_name || "—"}</Td>
                  <Td className="font-medium">{c.customer_name || "—"}</Td>
                  <Td className="tabular">
                    <Link
                      to={`/payflow/cases/${c.account_id}`}
                      className="text-primary hover:underline"
                    >
                      {c.account_reference || c.case_reference || "—"}
                    </Link>
                  </Td>
                  <Td>
                    <StatusPill tone={c.channel === "SMS" ? "info" : "neutral"}>
                      {c.channel}
                    </StatusPill>
                  </Td>
                  <Td>{c.purpose}</Td>
                  <Td className="text-muted-foreground">{c.workflow_name || "—"}</Td>
                  <Td>
                    <StatusPill tone={commStatusTone(c.status)}>{c.status}</StatusPill>
                  </Td>
                  <Td className="text-muted-foreground">{engagementLabel(c)}</Td>
                </Tr>
              ))}
            </DataTable>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <p className="text-[12px] text-muted-foreground">
                Showing {pageStart}–{pageEnd} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Btn
                  variant="secondary"
                  disabled={!canPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  Previous
                </Btn>
                <Btn
                  variant="secondary"
                  disabled={!canNext}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Next
                </Btn>
              </div>
            </div>
          </>
        ) : null}
      </Panel>
    </>
  );
}
