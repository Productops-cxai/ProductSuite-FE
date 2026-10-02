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

export function PayFlowCommsPage() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<PayflowCommunication[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [summary, setSummary] = useState<PayflowCommunicationsSummary>({
    sent_today: 0,
    delivered: 0,
    engaged: 0,
    clicks: 0,
    failed: 0,
  });
  const [dropOff, setDropOff] = useState<Record<string, number>>({});
  const [statuses, setStatuses] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [client, setClient] = useState("All Clients");
  const [channel, setChannel] = useState(searchParams.get("channel") || "All Channels");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");
  const [workflow, setWorkflow] = useState(searchParams.get("workflow") || "All Workflows");
  const [purpose, setPurpose] = useState("All Purposes");
  const [dateBucket, setDateBucket] = useState("All Dates");

  useEffect(() => {
    const nextStatus = searchParams.get("status");
    const nextChannel = searchParams.get("channel");
    const nextWorkflow = searchParams.get("workflow");
    if (nextStatus) setStatus(nextStatus);
    if (nextChannel) setChannel(nextChannel);
    if (nextWorkflow) setWorkflow(nextWorkflow);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listPayflowComms({}), listPayflowClients({})])
      .then(([commRes, clientRes]) => {
        if (cancelled) return;
        setRows(commRes.communications || []);
        setSummary(commRes.summary);
        setDropOff(commRes.drop_off || {});
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

  const dateOptions = useMemo(() => {
    const buckets = new Set<string>();
    rows.forEach((r) => {
      if (r.date_bucket) buckets.add(r.date_bucket);
    });
    return ["All Dates", ...Array.from(buckets)];
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((c) => {
      if (client !== "All Clients" && c.client_name !== client) return false;
      if (channel !== "All Channels" && c.channel !== channel) return false;
      if (status !== "All Statuses" && c.status !== status) return false;
      if (workflow !== "All Workflows" && c.workflow_name !== workflow) return false;
      if (purpose !== "All Purposes" && c.purpose !== purpose) return false;
      if (dateBucket !== "All Dates" && c.date_bucket !== dateBucket) return false;
      if (term) {
        const hay = [
          c.customer_name,
          c.account_reference,
          c.code,
          c.client_name,
          c.purpose,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, client, channel, status, workflow, purpose, dateBucket, search]);

  const dropOffEntries = Object.entries(dropOff);

  return (
    <>
      <PageHeader
        title="Communications"
        description="Monitor customer collection communications across Clients and channels."
      />

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Sent Today" value={String(summary.sent_today)} />
        <KpiCard label="Delivered" value={String(summary.delivered)} />
        <KpiCard label="Engaged" value={String(summary.engaged)} />
        <KpiCard label="Payment Link Clicks" value={String(summary.clicks)} tone="primary" />
        <KpiCard label="Failed" value={String(summary.failed)} />
      </div>

      {dropOffEntries.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Drop-off
          </span>
          {dropOffEntries.map(([segment, count]) => (
            <StatusPill key={segment}>
              {segment} · {count}
            </StatusPill>
          ))}
        </div>
      )}

      <Panel
        title="Communication Log"
        description="Every communication belongs to a client, customer account, collection case and workflow."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Customer, account reference or ID"
            className="w-64"
          />
          <FilterSelect
            label="Date"
            value={dateBucket}
            onChange={setDateBucket}
            options={dateOptions}
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
            options={["All Channels", ...channels]}
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

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading communications…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No communications match these filters"
            description="Adjust the search or filters to see customer communications."
          />
        ) : (
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
                      subtitle={c.date_label || undefined}
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
                    {c.account_reference || c.case_reference || `#${c.account_id}`}
                  </Link>
                </Td>
                <Td>{c.channel}</Td>
                <Td>{c.purpose}</Td>
                <Td>{c.workflow_name || "—"}</Td>
                <Td>
                  <StatusPill tone={commStatusTone(c.status)}>{c.status}</StatusPill>
                </Td>
                <Td>{c.engagement || "Not trackable"}</Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </>
  );
}
