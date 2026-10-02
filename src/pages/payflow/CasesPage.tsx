import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowAccounts, listPayflowClients } from "../../api/payflow";
import {
  DataTable,
  FilterSelect,
  PageHeader,
  StatusPill,
  Td,
  statusTone,
} from "../../components/payflow/lovable/payflow-ui";
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

export function PayFlowCasesPage() {
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<PayflowAccount[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [intake, setIntake] = useState<PayflowAccountsIntake>({
    files: 0,
    latest_received_at: "—",
    latest_assigned_at: "—",
    accounts_in_files: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [clientFilter, setClientFilter] = useState("All Clients");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");
  const [workflow, setWorkflow] = useState(searchParams.get("workflow") || "All Workflows");
  const [review, setReview] = useState(searchParams.get("human_review") || "All");

  useEffect(() => {
    const nextStatus = searchParams.get("status");
    const nextWorkflow = searchParams.get("workflow");
    const nextReview = searchParams.get("human_review");
    if (nextStatus) setStatus(nextStatus);
    if (nextWorkflow) setWorkflow(nextWorkflow);
    if (nextReview) setReview(nextReview);
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
        setWorkflows(accountRes.workflows || []);
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

  const rows = useMemo(() => {
    return accounts.filter((a) => {
      if (clientFilter !== "All Clients" && a.client_name !== clientFilter) return false;
      if (status !== "All Statuses" && a.collection_status !== status) return false;
      if (workflow !== "All Workflows" && a.current_workflow !== workflow) return false;
      if (review === "Yes" && !a.human_review) return false;
      if (review === "No" && a.human_review) return false;
      return true;
    });
  }, [accounts, clientFilter, status, workflow, review]);

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

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          label="Client"
          value={clientFilter}
          onChange={setClientFilter}
          options={["All Clients", ...clients.map((c) => c.name)]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            "All Statuses",
            ...statuses.filter((s) => s !== "Promise to Pay"),
          ]}
        />
        <FilterSelect
          label="Workflow"
          value={workflow}
          onChange={setWorkflow}
          options={["All Workflows", ...workflows]}
        />
        <FilterSelect
          label="Human Review"
          value={review}
          onChange={setReview}
          options={["All", "Yes", "No"]}
        />
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading accounts…</p> : null}

      {!loading && !error ? (
        <>
          <DataTable
            head={[
              "Client",
              "Customer",
              "Account Reference",
              "Outstanding Balance",
              "Collection Status",
              "Current Workflow",
              "Last Action",
              "Next Action",
              "Human Review",
            ]}
          >
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface">
                <Td>
                  <Link
                    to={`/payflow/clients/${a.client_id}`}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {a.client_name}
                  </Link>
                </Td>
                <Td>
                  <Link
                    to={`/payflow/cases/${a.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {a.customer_name}
                  </Link>
                </Td>
                <Td className="tabular text-muted-foreground">{a.account_reference}</Td>
                <Td className="tabular font-medium">{formatCurrency(a.outstanding_balance)}</Td>
                <Td>
                  <StatusPill tone={statusTone(a.collection_status)}>{a.collection_status}</StatusPill>
                </Td>
                <Td className="text-muted-foreground">{a.current_workflow || "—"}</Td>
                <Td className="text-muted-foreground">{a.last_action || "—"}</Td>
                <Td className="text-muted-foreground">{a.next_action || "—"}</Td>
                <Td
                  className={
                    a.human_review ? "font-medium text-destructive" : "text-muted-foreground"
                  }
                >
                  {a.human_review ? "Yes" : "No"}
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
