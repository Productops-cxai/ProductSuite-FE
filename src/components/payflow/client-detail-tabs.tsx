import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  listPayflowAccounts,
  listPayflowComms,
  listPayflowReviews,
  listPayflowRules,
  listPayflowWorkflows,
  type PayflowCommListParams,
} from "../../api/payflow";
import { dateRangeOrderError, resolveCommDateBounds } from "../../lib/comm-query";
import { ClientComplianceRulesPanel } from "./ClientComplianceRules";
import { CommDateRangeControls } from "./CommDateRangeControls";
import { CommunicationExportDialog } from "./CommunicationExportDialog";
import { MobileRecordCard, MobileRecordCards } from "../ui/MobileRecordCards";
import { Pagination } from "../ui/Pagination";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useClientPagedList, useOffsetPagination, usePagePagination } from "../../hooks/useOffsetPagination";
import {
  Btn,
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  Panel,
  SearchInput,
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

const PAGE_SIZE = 10;

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
    case "Rejected":
      return "danger";
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
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<PayflowAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { offset, pageSize, goPrev, goNext } = useOffsetPagination(PAGE_SIZE, clientId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayflowAccounts({ client_id: clientId, limit: pageSize, offset })
      .then((res) => {
        if (!cancelled) {
          setRows(res.accounts || []);
          setTotal(res.total ?? (res.accounts || []).length);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load accounts");
          setRows([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, pageSize, offset]);

  return (
    <Panel
      title="Accounts"
      description={`Customer accounts under collection for ${clientName}`}
      action={
        <Link
          to={`/payflow/cases?client=${encodeURIComponent(clientName)}`}
          className="text-[12.5px] font-semibold text-primary hover:underline"
        >
          Open Accounts / Cases
        </Link>
      }
    >
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading accounts…</p> : null}
      {!loading && !error && total === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Accounts appear here after the first CRM file sync for this client."
        />
      ) : null}
      {!loading && rows.length > 0 ? (
        <>
          {isMobile ? (
            <MobileRecordCards>
              {rows.map((a) => (
                <MobileRecordCard
                  key={a.id}
                  to={`/payflow/cases/${a.id}`}
                  title={a.customer_name}
                  subtitle={a.account_reference}
                  badges={
                    <StatusPill tone={statusTone(a.collection_status)}>
                      {a.collection_status}
                    </StatusPill>
                  }
                  meta={
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <span>{formatCurrency(a.outstanding_balance)}</span>
                      <span>{a.current_workflow || "—"}</span>
                      {a.human_review ? <span>Human review</span> : null}
                    </div>
                  }
                />
              ))}
            </MobileRecordCards>
          ) : (
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
                    <Link
                      to={`/payflow/cases/${a.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {a.customer_name}
                    </Link>
                  </Td>
                  <Td className="tabular text-muted-foreground">{a.account_reference}</Td>
                  <Td className="tabular font-medium">
                    {formatCurrency(a.outstanding_balance)}
                  </Td>
                  <Td>
                    <StatusPill tone={statusTone(a.collection_status)}>
                      {a.collection_status}
                    </StatusPill>
                  </Td>
                  <Td className="text-muted-foreground">{a.current_workflow || "—"}</Td>
                  <Td>{a.human_review ? <StatusPill tone="warning">Yes</StatusPill> : "—"}</Td>
                </Tr>
              ))}
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
  const { pageItems, total, offset, pageSize, goPrev, goNext } = useClientPagedList(
    rows,
    PAGE_SIZE,
    clientId,
  );

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
      {!loading && pageItems.length > 0 ? (
        <>
          <ul className="space-y-2">
            {pageItems.map((s) => (
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
          <Pagination
            total={total}
            offset={offset}
            pageSize={pageSize}
            rowCount={pageItems.length}
            onPrevious={goPrev}
            onNext={goNext}
          />
        </>
      ) : null}
    </Panel>
  );
}

export function ClientCommunicationsTab({
  clientId,
  clientName,
  portfolios,
}: {
  clientId: number;
  clientName: string;
  portfolios: { id: number; name: string }[];
}) {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<PayflowCommunication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [dateError, setDateError] = useState("");
  const [subClient, setSubClient] = useState("All Sub-Clients");
  const [exportOpen, setExportOpen] = useState(false);
  const [scopeId, setScopeId] = useState(clientId);
  if (scopeId !== clientId) {
    setScopeId(clientId);
    setQuery("");
    setDebouncedQuery("");
    setPendingFrom("");
    setPendingTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setDateError("");
    setSubClient("All Sub-Clients");
    setExportOpen(false);
  }

  const filterKey = [clientId, debouncedQuery, appliedFrom, appliedTo, subClient].join("|");
  const { offset, pageSize, goPrev, goNext } = useOffsetPagination(PAGE_SIZE, filterKey);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const selectedPortfolioId = useMemo(() => {
    if (subClient === "All Sub-Clients") return undefined;
    return portfolios.find((p) => p.name === subClient)?.id;
  }, [subClient, portfolios]);

  const dateBounds = useMemo(
    () => resolveCommDateBounds({}, appliedFrom, appliedTo),
    [appliedFrom, appliedTo],
  );

  const listFilters = useMemo<PayflowCommListParams>(
    () => ({
      client_id: clientId,
      portfolio_id: selectedPortfolioId,
      search: debouncedQuery || undefined,
      date_from: dateBounds.date_from,
      date_to: dateBounds.date_to,
    }),
    [clientId, selectedPortfolioId, debouncedQuery, dateBounds.date_from, dateBounds.date_to],
  );

  useEffect(() => {
    let cancelled = false;
    if (dateBounds.error) {
      setLoading(false);
      setError(dateBounds.error);
      setRows([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError("");
    listPayflowComms({ ...listFilters, limit: pageSize, offset })
      .then((res) => {
        if (!cancelled) {
          setRows(res.communications || []);
          setTotal(res.total ?? (res.communications || []).length);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load communications");
          setRows([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listFilters, dateBounds.error, pageSize, offset]);

  const rangeDirty = pendingFrom !== appliedFrom || pendingTo !== appliedTo;
  const rangeActive = Boolean(appliedFrom || appliedTo);
  const filtersActive = Boolean(debouncedQuery || appliedFrom || appliedTo || selectedPortfolioId);

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
    setDateError("");
  }

  return (
    <Panel
      title="Communications"
      description={`Customer communications sent for ${clientName} accounts`}
      action={
        <Link
          to={`/payflow/comms?client=${encodeURIComponent(clientName)}`}
          className="text-[12.5px] font-semibold text-primary hover:underline"
        >
          Full communication log
        </Link>
      }
    >
      <FilterBar className="mb-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search customer, email or account"
          className="w-full md:col-span-2 xl:w-72"
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
        {portfolios.length > 0 ? (
          <FilterSelect
            label="Sub-Client"
            value={subClient}
            onChange={setSubClient}
            options={["All Sub-Clients", ...portfolios.map((p) => p.name)]}
          />
        ) : null}
        <span
          className="inline-flex xl:ml-auto"
          title={
            loading
              ? "Loading communications"
              : total === 0
                ? "No communications match the current filters"
                : "Generate an export of this client's retained emails"
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
          {`${total} communication${total === 1 ? "" : "s"} match the current filters. Records older than this client's retention period are excluded.`}
        </p>
      ) : null}
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading communications…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title={filtersActive ? "No communications match these filters" : "No communications yet"}
          description={
            filtersActive
              ? "No retained communications match the selected filters. Adjust the filters or check the client's retention period."
              : "Outbound reminders and payment links for this client will appear here."
          }
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
                  title={c.customer_name || "—"}
                  subtitle={[c.recipient, c.channel, c.purpose].filter(Boolean).join(" · ")}
                  badges={<StatusPill>{c.status}</StatusPill>}
                  meta={
                    [c.portfolio_name, c.account_reference, c.date_label, c.time_label]
                      .filter(Boolean)
                      .join(" · ") || "—"
                  }
                />
              ))}
            </MobileRecordCards>
          ) : (
            <DataTable
              minWidth={980}
              head={["Customer", "Recipient", "Account", "Portfolio", "Subject", "Status", "When", ""]}
            >
              {rows.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium">{c.customer_name || "—"}</Td>
                  <Td className="text-muted-foreground">{c.recipient || "—"}</Td>
                  <Td className="tabular text-muted-foreground">
                    {c.account_reference || c.case_reference || "—"}
                  </Td>
                  <Td className="text-muted-foreground">{c.portfolio_name || "—"}</Td>
                  <Td className="text-muted-foreground">{c.subject || c.purpose}</Td>
                  <Td>
                    <StatusPill>{c.status}</StatusPill>
                  </Td>
                  <Td className="text-muted-foreground">
                    {[c.date_label, c.time_label].filter(Boolean).join(" · ") || "—"}
                  </Td>
                  <Td>
                    <Link
                      to={`/payflow/comms/${c.id}`}
                      className="text-[12.5px] font-semibold text-primary hover:underline"
                    >
                      View
                    </Link>
                  </Td>
                </Tr>
              ))}
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
      <CommunicationExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        filters={listFilters}
        searchLabel={debouncedQuery || undefined}
      />
    </Panel>
  );
}

export function ClientRulesTab({
  clientId,
  clientName,
  country,
  provinceState,
  city,
  postalCode,
  canEditOptional,
  canEditMandatory,
}: {
  clientId: number;
  clientName: string;
  country: string;
  provinceState: string;
  city: string;
  postalCode: string;
  canEditOptional: boolean;
  canEditMandatory: boolean;
}) {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<PayflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { pageItems, total, offset, pageSize, goPrev, goNext } = useClientPagedList(
    rows,
    PAGE_SIZE,
    clientId,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayflowRules({ client_id: clientId })
      .then((res) => {
        if (!cancelled) {
          setRows(res.rules || []);
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
    <div className="space-y-5">
      <Panel
        title="Compliance rules"
        description="Jurisdiction rules for this client. Optional selections are saved with the client and newly applicable rules are marked."
      >
        <ClientComplianceRulesPanel
          clientId={clientId}
          country={country}
          provinceState={provinceState}
          city={city}
          postalCode={postalCode}
          canEditOptional={canEditOptional}
          canEditMandatory={canEditMandatory}
          persist
        />
      </Panel>
      <Panel
        title="Rules"
        description={`Client rules for ${clientName}, plus system rules assigned in AI & Governance`}
        action={
          <Link to="/payflow/rules" className="text-[12.5px] font-semibold text-primary hover:underline">
            All rules
          </Link>
        }
      >
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading rules…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No rules yet"
          description="Rules that govern collection behaviour for this client will show here."
        />
      ) : null}
      {!loading && pageItems.length > 0 ? (
        <>
          {isMobile ? (
            <MobileRecordCards>
              {pageItems.map((r) => (
                <MobileRecordCard
                  key={r.id}
                  to={`/payflow/rules/${r.id}`}
                  title={r.name}
                  subtitle={`${r.rule_type} · ${r.category}`}
                  badges={
                    <StatusPill tone={ruleStatusTone(r.status)}>{r.status}</StatusPill>
                  }
                />
              ))}
            </MobileRecordCards>
          ) : (
            <DataTable minWidth={780} head={["Rule", "Type", "Category", "Status", ""]}>
              {pageItems.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium">{r.name}</Td>
                  <Td className="text-muted-foreground">{r.rule_type}</Td>
                  <Td className="text-muted-foreground">{r.category}</Td>
                  <Td>
                    <StatusPill tone={ruleStatusTone(r.status)}>{r.status}</StatusPill>
                  </Td>
                  <Td>
                    <Link
                      to={`/payflow/rules/${r.id}`}
                      className="text-[12.5px] font-semibold text-primary hover:underline"
                    >
                      View
                    </Link>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
          <Pagination
            total={total}
            offset={offset}
            pageSize={pageSize}
            rowCount={pageItems.length}
            onPrevious={goPrev}
            onNext={goNext}
          />
        </>
      ) : null}
      </Panel>
    </div>
  );
}

export function ClientReviewsTab({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<PayflowReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { page, pageSize, goPrev, goNext } = usePagePagination(PAGE_SIZE, clientId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayflowReviews({ client_id: clientId, page, page_size: pageSize })
      .then((res) => {
        if (!cancelled) {
          setRows(res.reviews || []);
          setTotal(res.total ?? (res.reviews || []).length);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load reviews");
          setRows([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, page, pageSize]);

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
      {!loading && !error && total === 0 ? (
        <EmptyState
          title="No reviews for this client"
          description="Human review exceptions raised for this client will appear here."
        />
      ) : null}
      {!loading && rows.length > 0 ? (
        <>
          {isMobile ? (
            <MobileRecordCards>
              {rows.map((r) => (
                <MobileRecordCard
                  key={r.id}
                  to={`/payflow/review/${r.id}`}
                  title={r.customer_name}
                  subtitle={r.reason}
                  badges={
                    <>
                      <StatusPill tone={r.priority === "High" ? "danger" : "neutral"}>
                        {r.priority}
                      </StatusPill>
                      <StatusPill tone={reviewStatusTone(r.status)}>{r.status}</StatusPill>
                    </>
                  }
                  meta={r.waiting_label || "—"}
                />
              ))}
            </MobileRecordCards>
          ) : (
            <DataTable
              minWidth={860}
              head={["Customer", "Reason", "Priority", "Status", "Waiting", ""]}
            >
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium">{r.customer_name}</Td>
                  <Td className="text-muted-foreground">{r.reason}</Td>
                  <Td>
                    <StatusPill tone={r.priority === "High" ? "danger" : "neutral"}>
                      {r.priority}
                    </StatusPill>
                  </Td>
                  <Td>
                    <StatusPill tone={reviewStatusTone(r.status)}>{r.status}</StatusPill>
                  </Td>
                  <Td className="text-muted-foreground">{r.waiting_label || "—"}</Td>
                  <Td>
                    <Link
                      to={`/payflow/review/${r.id}`}
                      className="text-[12.5px] font-semibold text-primary hover:underline"
                    >
                      Review
                    </Link>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
          <Pagination
            mode="page"
            total={total}
            page={page}
            pageSize={pageSize}
            rowCount={rows.length}
            onPrevious={goPrev}
            onNext={goNext}
            disabled={loading}
          />
        </>
      ) : null}
    </Panel>
  );
}
