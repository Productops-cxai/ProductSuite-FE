import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowComms } from "../../api/payflow";
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
import type {
  PayflowClient,
  PayflowCommunication,
  PayflowCommunicationsSummary,
} from "../../types";

const DATE_RANGES = ["Today", "Yesterday", "Last 7 Days", "This Month"];

const EMPTY_SUMMARY: PayflowCommunicationsSummary = {
  sent_today: 0,
  delivered: 0,
  engaged: 0,
  clicks: 0,
  failed: 0,
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [date, setDate] = useState("All Dates");
  const [client, setClient] = useState(searchParams.get("client") || "All Clients");
  const [channel, setChannel] = useState(searchParams.get("channel") || "All Channels");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");
  const [workflow, setWorkflow] = useState(
    searchParams.get("journey") || searchParams.get("workflow") || "All Workflows",
  );
  const [purpose, setPurpose] = useState("All Purposes");

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
    let cancelled = false;
    setLoading(true);
    Promise.all([listPayflowComms({}), listPayflowClients({})])
      .then(([commRes, clientRes]) => {
        if (cancelled) return;
        setRows(commRes.communications || []);
        setSummary(commRes.summary || EMPTY_SUMMARY);
        setDropOff(commRes.drop_off || {});
        setDropOffSegments(commRes.drop_off_segments || []);
        setStatuses(commRes.statuses || []);
        setChannels(commRes.channels || []);
        setPurposes(commRes.purposes || []);
        setWorkflows(commRes.workflows || []);
        setClients(clientRes.clients || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load communications");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((c) => {
      if (term) {
        const hay = [
          c.code,
          String(c.id),
          c.customer_name,
          c.account_reference,
          c.case_reference,
          c.purpose,
          c.channel,
          c.workflow_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (date !== "All Dates" && c.date_bucket !== date) return false;
      if (client !== "All Clients" && c.client_name !== client) return false;
      if (channel !== "All Channels" && c.channel !== channel) return false;
      if (status !== "All Statuses" && c.status !== status) return false;
      if (workflow !== "All Workflows" && c.workflow_name !== workflow) return false;
      if (purpose !== "All Purposes" && c.purpose !== purpose) return false;
      return true;
    });
  }, [rows, query, date, client, channel, status, workflow, purpose]);

  const segments =
    dropOffSegments.length > 0
      ? dropOffSegments
      : [
          "Delivered but Not Opened / Read",
          "Opened / Read but Did Not Click",
          "Clicked but Did Not Initiate Payment",
        ];

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
        description="Every communication belongs to a client, customer account, collection case and workflow."
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

        {!loading && !error && filtered.length === 0 ? (
          <EmptyState
            title="No communications match these filters"
            description="Adjust the search or filters to see customer communications."
          />
        ) : null}

        {!loading && !error && filtered.length > 0 ? (
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
            {filtered.map((c) => (
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
        ) : null}
      </Panel>
    </>
  );
}
