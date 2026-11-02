import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  listPayflowAccounts,
  listPayflowClientPortfolios,
  listPayflowClients,
} from "../../api/payflow";
import {
  Btn,
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  SearchInput,
  StatusPill,
  Td,
  statusTone,
} from "../../components/payflow/lovable/payflow-ui";
import { MobileRecordCard, MobileRecordCards } from "../../components/ui/MobileRecordCards";
import { Pagination } from "../../components/ui/Pagination";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useOffsetPagination } from "../../hooks/useOffsetPagination";
import type {
  PayflowAccount,
  PayflowAccountsIntake,
  PayflowClient,
  PayflowPortfolio,
} from "../../types";

const PAGE_SIZE = 10;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatStamp(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PayFlowCasesPage() {
  const { hasPermission } = usePayFlowAccess();
  const canImport = hasPermission("import_accounts");
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<PayflowAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [portfolios, setPortfolios] = useState<PayflowPortfolio[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [intake, setIntake] = useState<PayflowAccountsIntake>({
    files: 0,
    latest_received_at: "—",
    latest_assigned_at: "—",
    accounts_in_files: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [subClient, setSubClient] = useState("All Sub-Clients");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");
  const [workflow, setWorkflow] = useState("All Workflows");
  const [humanReview, setHumanReview] = useState("All");

  const filterKey = [
    debouncedSearch,
    clientFilter,
    subClient,
    status,
    workflow,
    humanReview,
  ].join("|");
  const { offset, pageSize, goPrev, goNext } = useOffsetPagination(PAGE_SIZE, filterKey);

  useEffect(() => {
    const nextStatus = searchParams.get("status");
    if (nextStatus) setStatus(nextStatus);
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
        /* filters still work without names */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClientId = useMemo(() => {
    if (clientFilter === "All Clients") return undefined;
    return clients.find((c) => c.name === clientFilter)?.id;
  }, [clientFilter, clients]);

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

  const subClientOptions = useMemo(
    () => ["All Sub-Clients", ...portfolios.map((p) => p.name)],
    [portfolios],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listPayflowAccounts({
      client_id: selectedClientId,
      portfolio_id: selectedPortfolioId,
      status: status !== "All Statuses" ? status : undefined,
      workflow: workflow !== "All Workflows" ? workflow : undefined,
      human_review: humanReview !== "All" ? humanReview : undefined,
      search: debouncedSearch || undefined,
      limit: pageSize,
      offset,
    })
      .then((accountRes) => {
        if (cancelled) return;
        setAccounts(accountRes.accounts || []);
        setTotal(accountRes.total ?? (accountRes.accounts || []).length);
        setIntake(accountRes.intake);
        setStatuses(accountRes.statuses || []);
        setWorkflows(accountRes.workflows || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load accounts");
          setAccounts([]);
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
    selectedPortfolioId,
    status,
    workflow,
    humanReview,
    debouncedSearch,
    pageSize,
    offset,
  ]);

  return (
    <>
      <PageHeader
        title="Accounts / Cases"
        description="Customer accounts under collection across all clients in your access scope."
        actions={
          canImport ? (
            <>
              <Link to="/payflow/imports?type=account">
                <Btn variant="ghost">Import History</Btn>
              </Link>
              <Link to="/payflow/cases/import">
                <Btn variant="primary">Upload Daily CRM File</Btn>
              </Link>
            </>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <p className="text-eyebrow">File Received</p>
          <p className="text-[13px] font-semibold text-foreground">{intake.latest_received_at}</p>
        </div>
        <div>
          <p className="text-eyebrow">Assigned To Collections</p>
          <p className="text-[13px] font-semibold text-foreground">{intake.latest_assigned_at}</p>
        </div>
        <div>
          <p className="text-eyebrow">Accounts In Current File</p>
          <p className="tabular text-[13px] font-semibold text-foreground">
            {formatNumber(intake.accounts_in_files)}
          </p>
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          Figures below reflect the most recently received source-system file
          {intake.files > 1 ? `s (${intake.files} clients)` : ""}.
        </p>
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search account ID or customer"
          className="w-full md:col-span-2 xl:w-64"
        />
        <FilterSelect
          label="Client"
          value={clientFilter}
          onChange={(v) => {
            setClientFilter(v);
            setSubClient("All Sub-Clients");
          }}
          options={["All Clients", ...clients.map((c) => c.name)]}
        />
        {selectedClientId != null ? (
          <FilterSelect
            label="Sub-Client"
            value={subClient}
            onChange={setSubClient}
            options={subClientOptions}
          />
        ) : null}
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
          label="Human Review"
          value={humanReview}
          onChange={setHumanReview}
          options={["All", "Yes", "No"]}
        />
      </FilterBar>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading accounts…</p> : null}

      {!loading && !error && total === 0 && !debouncedSearch && clientFilter === "All Clients" ? (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Upload the daily CRM file to create them.
        </p>
      ) : null}

      {!loading && !error && accounts.length === 0 && total === 0 && (debouncedSearch || clientFilter !== "All Clients") ? (
        <p className="text-sm text-muted-foreground">No accounts match these filters.</p>
      ) : null}

      {!loading && !error && accounts.length > 0 ? (
        <>
          {isMobile ? (
            <MobileRecordCards>
              {accounts.map((a) => (
                <MobileRecordCard
                  key={a.id}
                  to={`/payflow/cases/${a.id}`}
                  title={a.customer_name}
                  subtitle={`${a.account_reference} · ${a.client_name}`}
                  badges={
                    <StatusPill tone={statusTone(a.collection_status)}>
                      {a.collection_status}
                    </StatusPill>
                  }
                  meta={
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <span>{formatCurrency(a.outstanding_balance)}</span>
                      <span>
                        DPD {a.days_past_due == null ? "—" : a.days_past_due}
                      </span>
                      {a.portfolio_name ? <span>{a.portfolio_name}</span> : null}
                    </div>
                  }
                />
              ))}
            </MobileRecordCards>
          ) : (
            <DataTable
              minWidth={1180}
              head={[
                "Account ID",
                "Customer",
                "Client",
                "Sub-Client",
                "Outstanding",
                "Status",
                "Days past due",
                "Last updated",
                "",
              ]}
            >
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <Td className="tabular font-medium">{a.account_reference}</Td>
                  <Td>
                    <Link
                      to={`/payflow/cases/${a.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {a.customer_name}
                    </Link>
                  </Td>
                  <Td>
                    <Link
                      to={`/payflow/clients/${a.client_id}`}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {a.client_name}
                    </Link>
                  </Td>
                  <Td className="text-muted-foreground">{a.portfolio_name || "—"}</Td>
                  <Td className="tabular font-medium">
                    {formatCurrency(a.outstanding_balance)}
                  </Td>
                  <Td>
                    <StatusPill tone={statusTone(a.collection_status)}>
                      {a.collection_status}
                    </StatusPill>
                  </Td>
                  <Td className="tabular text-muted-foreground">
                    {a.days_past_due == null ? "—" : a.days_past_due}
                  </Td>
                  <Td className="text-muted-foreground">
                    {formatStamp(a.last_crm_refresh_at || a.updated_at)}
                  </Td>
                  <Td>
                    <Link
                      to={`/payflow/cases/${a.id}`}
                      className="text-[12.5px] font-semibold text-primary hover:underline"
                    >
                      View Account
                    </Link>
                  </Td>
                </tr>
              ))}
            </DataTable>
          )}
          <Pagination
            total={total}
            offset={offset}
            pageSize={pageSize}
            rowCount={accounts.length}
            onPrevious={goPrev}
            onNext={goNext}
            disabled={loading}
          />
        </>
      ) : null}
    </>
  );
}
