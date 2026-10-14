import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowWorkflows } from "../../api/payflow";
import { StrategyMiniMap } from "../../components/payflow/strategy-canvas";
import {
  Btn,
  EmptyState,
  FilterSelect,
  PageHeader,
  SearchInput,
  StatusPill,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import {
  originTone,
  segmentChips,
  strategyStatusTone,
} from "../../lib/strategy-workflow";
import { cn } from "../../lib/utils";
import type {
  PayflowClient,
  PayflowStrategiesSummary,
  PayflowStrategy,
} from "../../types";

export function PayFlowWorkflowsPage() {
  const { hasPermission } = usePayFlowAccess();
  const canCreate = hasPermission("create_edit_workflows");
  const [searchParams] = useSearchParams();
  const [strategies, setStrategies] = useState<PayflowStrategy[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [summary, setSummary] = useState<PayflowStrategiesSummary>({
    total: 0,
    ai_proposed: 0,
    active: 0,
    under_review: 0,
  });
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [client, setClient] = useState(searchParams.get("client") || "All Clients");
  const [portfolio, setPortfolio] = useState(searchParams.get("portfolio") || "All Portfolios");
  const [status, setStatus] = useState(searchParams.get("status") || "All Statuses");

  useEffect(() => {
    let cancelled = false;
    listPayflowClients({})
      .then((res) => {
        if (!cancelled) setClients(res.clients || []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const clientMatch = clients.find((c) => c.name === client);
    // Wait for clients when a named client filter is set so we can pass client_id.
    if (client !== "All Clients" && clients.length === 0) {
      return () => {
        cancelled = true;
      };
    }
    listPayflowWorkflows({
      client_id: clientMatch?.id,
      status: status !== "All Statuses" ? status : undefined,
      search: search.trim() || undefined,
    })
      .then((wfRes) => {
        if (cancelled) return;
        setStrategies(wfRes.strategies || []);
        setSummary(wfRes.summary);
        setStatuses(wfRes.statuses || []);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load workflows");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, status, search, clients]);

  const portfolioOptions = useMemo(() => {
    const names = new Set<string>();
    strategies.forEach((s) => {
      if (!s.portfolio_name) return;
      if (client !== "All Clients" && s.client_name !== client) return;
      names.add(s.portfolio_name);
    });
    return ["All Portfolios", ...Array.from(names).sort()];
  }, [strategies, client]);

  const rows = useMemo(() => {
    return strategies.filter((s) => {
      if (client !== "All Clients" && s.client_name !== client) return false;
      if (portfolio !== "All Portfolios" && s.portfolio_name !== portfolio) return false;
      return true;
    });
  }, [strategies, client, portfolio]);

  const awaiting =
    summary.awaiting_review ?? summary.ai_proposed + (summary.under_review || 0);

  return (
    <>
      <PageHeader
        title="Strategies / Workflows"
        description="PayFlow proposes a strategy from collection data and case context — and a person can create one too. Every strategy is reviewed and approved before it runs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {awaiting > 0 && (
              <StatusPill tone="ai" dot>
                {awaiting} awaiting review
              </StatusPill>
            )}
            {canCreate ? (
              <Link to="/payflow/workflows/new">
                <Btn variant="primary">Create workflow</Btn>
              </Link>
            ) : null}
          </div>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search strategies"
          className="w-56"
        />
        <FilterSelect
          label="Client"
          value={client}
          onChange={(v) => {
            setClient(v);
            setPortfolio("All Portfolios");
          }}
          options={["All Clients", ...clients.map((c) => c.name)]}
        />
        <FilterSelect
          label="Portfolio"
          value={portfolio}
          onChange={setPortfolio}
          options={portfolioOptions}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...(statuses.length ? statuses : [
            "AI Proposed",
            "Draft",
            "Under Review",
            "Approved",
            "Active",
            "Inactive",
          ])]}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading workflows…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={strategies.length === 0 ? "No strategies yet" : "No strategies match these filters"}
          description={
            strategies.length === 0
              ? "Create a workflow manually, or wait for PayFlow AI to propose one for an eligible portfolio."
              : "Adjust the client, portfolio or status filter to see proposed and approved strategies."
          }
          action={
            canCreate && strategies.length === 0 ? (
              <Link to="/payflow/workflows/new">
                <Btn variant="primary">Create workflow</Btn>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => {
            const awaitingCard = s.awaiting_review || s.status === "AI Proposed" || s.status === "Under Review";
            return (
              <Link
                key={s.id}
                to={`/payflow/workflows/${s.id}`}
                className={cn(
                  "group rounded-xl border bg-card px-4 py-4 shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-panel",
                  awaitingCard ? "border-ai/40 ring-1 ring-ai/15" : "border-border/80",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] leading-snug font-semibold text-foreground group-hover:text-primary">
                    {s.name}
                  </p>
                  <StatusPill tone={strategyStatusTone(s.status)} dot>
                    {s.status}
                  </StatusPill>
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  {s.client_name || "Client"}
                  {s.portfolio_name ? ` · ${s.portfolio_name}` : ""}
                </p>

                <div className="mt-3">
                  <StrategyMiniMap strategy={s} />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11.5px] text-muted-foreground">
                  <span className="tabular">{s.stats?.steps ?? s.steps?.length ?? 0} steps</span>
                  <span>{s.stats?.branches ?? 0} branches</span>
                  <span>{s.stats?.emails ?? 0} email</span>
                  <span>{s.stats?.sms ?? 0} sms</span>
                </div>

                {s.summary && (
                  <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                    {s.summary}
                  </p>
                )}

                {segmentChips(s.segment).length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {segmentChips(s.segment)
                      .slice(0, 4)
                      .map((chip) => (
                        <StatusPill key={chip}>{chip}</StatusPill>
                      ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <StatusPill tone={originTone(s.origin)}>{s.origin}</StatusPill>
                  {(s.human_modified || s.origin === "Human Modified") && (
                    <StatusPill tone="info">Human Modified</StatusPill>
                  )}
                  {s.source === "AI Generated" && s.origin !== "AI Proposed" && (
                    <StatusPill tone="ai">AI Generated</StatusPill>
                  )}
                  {s.source === "Human Created" && (
                    <StatusPill>Human Created</StatusPill>
                  )}
                  <StatusPill>v{s.version}</StatusPill>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[11.5px] text-muted-foreground">
                  <span>
                    {s.cases_covered != null
                      ? `${s.cases_covered.toLocaleString()} cases`
                      : s.coverage || "Targeted segment"}
                  </span>
                  <span>{s.last_updated_label ? `Updated ${s.last_updated_label}` : ""}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
