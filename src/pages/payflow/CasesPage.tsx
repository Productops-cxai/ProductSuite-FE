import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowAccounts, listPayflowClients } from "../../api/payflow";
import {
  Btn,
  DataTable,
  FilterSelect,
  PageHeader,
  SearchInput,
  StatusPill,
  Td,
  statusTone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import type { PayflowAccount, PayflowAccountsIntake, PayflowClient } from "../../types";

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
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<PayflowAccount[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [intake, setIntake] = useState<PayflowAccountsIntake>({
    files: 0,
    latest_received_at: "—",
    latest_assigned_at: "—",
    accounts_in_files: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [subClient, setSubClient] = useState("All Sub-Clients");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");

  useEffect(() => {
    const nextStatus = searchParams.get("status");
    if (nextStatus) setStatus(nextStatus);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([listPayflowAccounts({}), listPayflowClients({})])
      .then(([accountRes, clientRes]) => {
        if (cancelled) return;
        setAccounts(accountRes.accounts || []);
        setIntake(accountRes.intake);
        setStatuses(accountRes.statuses || []);
        setClients(clientRes.clients || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load accounts");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subClientOptions = useMemo(() => {
    const names = new Set<string>();
    for (const a of accounts) {
      if (clientFilter !== "All Clients" && a.client_name !== clientFilter) continue;
      if (a.portfolio_name) names.add(a.portfolio_name);
    }
    return ["All Sub-Clients", ...[...names].sort()];
  }, [accounts, clientFilter]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (
        q &&
        !`${a.account_reference} ${a.customer_name} ${a.email || ""} ${a.client_name || ""}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      if (clientFilter !== "All Clients" && a.client_name !== clientFilter) return false;
      if (subClient !== "All Sub-Clients" && a.portfolio_name !== subClient) return false;
      if (status !== "All Statuses" && a.collection_status !== status) return false;
      return true;
    });
  }, [accounts, search, clientFilter, subClient, status]);

  const scopedIntake = useMemo(() => {
    if (clientFilter === "All Clients") return intake;
    const scoped = accounts.filter((a) => a.client_name === clientFilter);
    return {
      ...intake,
      files: scoped.length > 0 ? 1 : 0,
      accounts_in_files: scoped.length,
    };
  }, [accounts, clientFilter, intake]);

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
          <p className="text-[13px] font-semibold text-foreground">{scopedIntake.latest_received_at}</p>
        </div>
        <div>
          <p className="text-eyebrow">Assigned To Collections</p>
          <p className="text-[13px] font-semibold text-foreground">{scopedIntake.latest_assigned_at}</p>
        </div>
        <div>
          <p className="text-eyebrow">Accounts In Current File</p>
          <p className="tabular text-[13px] font-semibold text-foreground">
            {formatNumber(scopedIntake.accounts_in_files)}
          </p>
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          Figures below reflect the most recently received source-system file
          {scopedIntake.files > 1 ? `s (${scopedIntake.files} clients)` : ""}.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search account ID or customer"
          className="w-64"
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
        <FilterSelect
          label="Sub-Client"
          value={subClient}
          onChange={setSubClient}
          options={subClientOptions}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...statuses]}
        />
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading accounts…</p> : null}

      {!loading && !error && accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet. Upload the daily CRM file to create them.</p>
      ) : null}

      {!loading && !error && accounts.length > 0 ? (
        <>
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
            {rows.map((a) => (
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
                <Td className="tabular font-medium">{formatCurrency(a.outstanding_balance)}</Td>
                <Td>
                  <StatusPill tone={statusTone(a.collection_status)}>{a.collection_status}</StatusPill>
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
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No accounts match these filters.</p>
          ) : null}
        </>
      ) : null}
    </>
  );
}
