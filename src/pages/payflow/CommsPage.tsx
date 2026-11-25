import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  listPayflowClientPortfolios,
  listPayflowClients,
  listPayflowComms,
  type PayflowCommListParams,
} from "../../api/payflow";
import { CommDateRangeControls } from "../../components/payflow/CommDateRangeControls";
import { CommunicationExportDialog } from "../../components/payflow/CommunicationExportDialog";
import {
  Btn,
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  KpiCard,
  KpiGrid,
  PageHeader,
  Panel,
  PrimaryCell,
  SearchInput,
  StatusPill,
  TabBar,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { PayFlowEmailUnsubscribesPage } from "./EmailUnsubscribesPage";
import { MobileRecordCard, MobileRecordCards } from "../../components/ui/MobileRecordCards";
import { Pagination } from "../../components/ui/Pagination";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useOffsetPagination } from "../../hooks/useOffsetPagination";
import { dateRangeOrderError, presetDateRangeToParams, resolveCommDateBounds } from "../../lib/comm-query";
import type {
  PayflowClient,
  PayflowCommunication,
  PayflowCommunicationsSummary,
  PayflowPortfolio,
} from "../../types";

const DATE_RANGES = ["Today", "Yesterday", "Last 7 Days", "This Month"];
const PAGE_SIZE = 10;

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

const COMM_TABS = ["Communications", "Unsubscribers"] as const;

export function PayFlowCommsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showUnsubscribers = searchParams.get("tab") === "unsubscribers";
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<PayflowCommunication[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [portfolios, setPortfolios] = useState<PayflowPortfolio[]>([]);
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
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [dateError, setDateError] = useState("");
  const [subClient, setSubClient] = useState("All Sub-Clients");
  const [exportOpen, setExportOpen] = useState(false);
  const [client, setClient] = useState(searchParams.get("client") || "All Clients");
  const [channel, setChannel] = useState(searchParams.get("channel") || "All Channels");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");
  const [workflow, setWorkflow] = useState(
    searchParams.get("journey") || searchParams.get("workflow") || "All Workflows",
  );
  const [purpose, setPurpose] = useState("All Purposes");
  const filterKey = [
    debouncedQuery,
    date,
    appliedFrom,
    appliedTo,
    client,
    subClient,
    channel,
    status,
    workflow,
    purpose,
  ].join("|");
  const { offset, pageSize, goPrev, goNext } = useOffsetPagination(PAGE_SIZE, filterKey);

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
    if (selectedClientId == null) {
      setPortfolios([]);
      return;
    }
    listPayflowClientPortfolios(selectedClientId)
      .then((res) => {
        if (!cancelled) setPortfolios(res.portfolios || []);
      })
      .catch(() => {
        if (!cancelled) setPortfolios([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClientId]);

  const selectedPortfolioId = useMemo(() => {
    if (subClient === "All Sub-Clients") return undefined;
    return portfolios.find((p) => p.name === subClient)?.id;
  }, [subClient, portfolios]);

  const dateBounds = useMemo(
    () => resolveCommDateBounds(presetDateRangeToParams(date), appliedFrom, appliedTo),
    [date, appliedFrom, appliedTo],
  );

  const listFilters = useMemo<PayflowCommListParams>(
    () => ({
      client_id: selectedClientId,
      portfolio_id: selectedPortfolioId,
      status: status !== "All Statuses" ? status : undefined,
      channel: channel !== "All Channels" ? channel : undefined,
      purpose: purpose !== "All Purposes" ? purpose : undefined,
      workflow: workflow !== "All Workflows" ? workflow : undefined,
      search: debouncedQuery.trim() || undefined,
      date_from: dateBounds.date_from,
      date_to: dateBounds.date_to,
    }),
    [
      selectedClientId,
      selectedPortfolioId,
      status,
      channel,
      purpose,
      workflow,
      debouncedQuery,
      dateBounds.date_from,
      dateBounds.date_to,
    ],
  );

  useEffect(() => {
    if (showUnsubscribers) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (dateBounds.error) {
      setLoading(false);
      setError(dateBounds.error);
      setRows([]);
      setSummary(EMPTY_SUMMARY);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError("");
    listPayflowComms({ ...listFilters, limit: pageSize, offset })
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
  }, [listFilters, dateBounds.error, offset, pageSize, showUnsubscribers]);

  const rangeDirty = pendingFrom !== appliedFrom || pendingTo !== appliedTo;
  const rangeActive = Boolean(appliedFrom || appliedTo || date !== "All Dates");

  function applyRange() {
    const message = dateRangeOrderError(pendingFrom, pendingTo);
    if (message) {
      setDateError(message);
      return;
    }
    setDateError("");
    setAppliedFrom(pendingFrom);
    setAppliedTo(pendingTo);
  }

  function resetRange() {
    setPendingFrom("");
    setPendingTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setDate("All Dates");
    setDateError("");
  }

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
        description={
          showUnsubscribers
            ? "Customers who opted out of collection email. The link is included only when the client applies Unsubscribe Option (Consent & Opt-Out). Review flags do not delay the opt-out."
            : "Monitor customer collection communications across Clients and channels."
        }
      />

      <TabBar
        tabs={COMM_TABS}
        active={showUnsubscribers ? "Unsubscribers" : "Communications"}
        onChange={(next) => {
          const params = new URLSearchParams(searchParams);
          if (next === "Unsubscribers") params.set("tab", "unsubscribers");
          else params.delete("tab");
          setSearchParams(params, { replace: true });
        }}
      />

      {showUnsubscribers ? <PayFlowEmailUnsubscribesPage embedded /> : null}

      {showUnsubscribers ? null : (
      <>
      <KpiGrid className="mb-4 grid-cols-2 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <KpiCard label="Sent Today" value={String(summary.sent_today)} />
        <KpiCard label="Delivered" value={String(summary.delivered)} />
        <KpiCard label="Engaged" value={String(summary.engaged)} />
        <KpiCard label="Payment Link Clicks" value={String(summary.clicks)} tone="primary" />
        <KpiCard label="Failed" value={String(summary.failed)} />
      </KpiGrid>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
        <span className="shrink-0 pt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Drop-off
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:flex-wrap">
          {segments.map((segment) => (
            <span
              key={segment}
              className="inline-flex max-w-full rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] leading-snug font-medium text-foreground"
            >
              <span className="min-w-0 break-words">
                {segment} · {dropOff[segment] ?? 0}
              </span>
            </span>
          ))}
        </div>
      </div>

      <Panel
        title="Communication Log"
        description="Every communication belongs to a client, customer account, collection case and workflow. KPIs above reflect the current filters."
      >
        <FilterBar className="mb-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search client, customer, email or account"
            className="w-full md:col-span-2 xl:w-72"
          />
          <FilterSelect
            label="Date"
            value={date}
            onChange={setDate}
            options={["All Dates", ...DATE_RANGES]}
          />
          <CommDateRangeControls
            from={pendingFrom}
            to={pendingTo}
            onFrom={(value) => {
              setPendingFrom(value);
              setDateError("");
            }}
            onTo={(value) => {
              setPendingTo(value);
              setDateError("");
            }}
            showApply={rangeDirty}
            showReset={rangeDirty || rangeActive}
            onApply={applyRange}
            onReset={resetRange}
          />
          <FilterSelect
            label="Client"
            value={client}
            onChange={(value) => {
              setClient(value);
              setSubClient("All Sub-Clients");
            }}
            options={["All Clients", ...clients.map((c) => c.name)]}
          />
          {selectedClientId != null ? (
            <FilterSelect
              label="Sub-Client"
              value={subClient}
              onChange={setSubClient}
              options={["All Sub-Clients", ...portfolios.map((p) => p.name)]}
            />
          ) : null}
          <FilterSelect
            label="Channel"
            value={channel}
            onChange={setChannel}
            options={["All Channels", ...(channels.length ? channels : ["Email", "SMS"])]}
          />
          <span
            className="hidden h-9 w-full min-w-0 cursor-not-allowed items-center gap-2 rounded-md border border-border bg-surface px-2.5 opacity-60 md:flex xl:w-auto"
            title="WhatsApp is coming later"
          >
            <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Channel</span>
            <span className="truncate text-[13px] font-medium text-muted-foreground">
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
          <span
            className="inline-flex xl:ml-auto"
            title={
              loading
                ? "Loading communications"
                : total === 0
                  ? "No communications match the current filters"
                  : "Generate an export of the retained emails for these filters"
            }
          >
            <Btn
              variant="primary"
              disabled={loading || total === 0 || Boolean(dateBounds.error)}
              onClick={() => setExportOpen(true)}
            >
              Generate Exportable View
            </Btn>
          </span>
        </FilterBar>

        {dateError ? <p className="mb-3 text-sm text-destructive">{dateError}</p> : null}
        {!dateError && !loading ? (
          <p className="mb-3 text-[12px] text-muted-foreground">
            {`${total} communication${total === 1 ? "" : "s"} match the current filters. Records older than each client's retention period are excluded.`}
          </p>
        ) : null}

        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading communications…</p> : null}

        {!loading && !error && rows.length === 0 ? (
          <EmptyState
            title="No communications match these filters"
            description="No retained communications match the selected filters. Adjust the filters or check the client's retention period."
          />
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <>
            {isMobile ? (
              <MobileRecordCards>
                {rows.map((c) => (
                  <MobileRecordCard
                    key={c.id}
                    to={`/payflow/comms/${c.id}`}
                    title={c.customer_name || c.time_label || "—"}
                    subtitle={`${c.client_name || "—"}${c.portfolio_name ? ` · ${c.portfolio_name}` : ""} · ${c.time_label || c.date_label || "—"}`}
                    badges={
                      <>
                        <StatusPill tone={c.channel === "SMS" ? "info" : "neutral"}>
                          {c.channel}
                        </StatusPill>
                        <StatusPill tone={commStatusTone(c.status)}>{c.status}</StatusPill>
                      </>
                    }
                    meta={
                      <div className="space-y-0.5">
                        <p>{c.purpose}</p>
                        <p>{engagementLabel(c)}</p>
                      </div>
                    }
                  />
                ))}
              </MobileRecordCards>
            ) : (
              <DataTable
                minWidth={1240}
                head={[
                  "Time",
                  "Client",
                  "Portfolio",
                  "Customer",
                  "Account",
                  "Channel",
                  "Purpose",
                  "Workflow",
                  "Status",
                  "Engagement",
                ]}
              >
                {rows.map((c) => {
                  const preview = (c.body_lines || []).filter(Boolean).join(" ").slice(0, 80);
                  const subtitleParts = [
                    c.date_label || c.code,
                    c.recipient || null,
                    c.channel === "Email" && c.subject ? c.subject : null,
                    preview || null,
                  ].filter(Boolean);
                  return (
                    <Tr key={c.id}>
                      <Td>
                        <Link to={`/payflow/comms/${c.id}`}>
                          <PrimaryCell
                            title={
                              <span className="tabular text-primary hover:underline">
                                {c.time_label || "—"}
                              </span>
                            }
                            subtitle={subtitleParts.join(" · ")}
                          />
                        </Link>
                      </Td>
                      <Td>{c.client_name || "—"}</Td>
                      <Td className="text-muted-foreground">{c.portfolio_name || "—"}</Td>
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
                  );
                })}
              </DataTable>
            )}
            <Pagination
              total={total}
              offset={offset}
              pageSize={pageSize}
              rowCount={rows.length}
              onPrevious={goPrev}
              onNext={goNext}
              disabled={loading}
            />
          </>
        ) : null}
      </Panel>
      <CommunicationExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        filters={listFilters}
        searchLabel={debouncedQuery.trim() || undefined}
      />
      </>
      )}
    </>
  );
}
