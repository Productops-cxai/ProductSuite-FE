import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowWorkflows } from "../../api/payflow";
import {
  Btn,
  EmptyState,
  FilterSelect,
  PageHeader,
  SearchInput,
  StatusPill,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import type {
  PayflowClient,
  PayflowStrategiesSummary,
  PayflowStrategy,
} from "../../types";

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
    default:
      return "neutral";
  }
}

function segmentChips(segment: Record<string, string>) {
  return Object.entries(segment || {})
    .filter(([, v]) => !!v)
    .map(([k, v]) => {
      const label = k
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `${label}: ${v}`;
    });
}

export function PayFlowWorkflowsPage() {
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
  const [client, setClient] = useState("All Clients");
  const [portfolio, setPortfolio] = useState("All Portfolios");
  const [status, setStatus] = useState("All Statuses");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listPayflowWorkflows({}), listPayflowClients({})])
      .then(([wfRes, clientRes]) => {
        if (cancelled) return;
        setStrategies(wfRes.strategies || []);
        setSummary(wfRes.summary);
        setStatuses(wfRes.statuses || []);
        setClients(clientRes.clients || []);
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
  }, []);

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
    const term = search.trim().toLowerCase();
    return strategies.filter((s) => {
      if (client !== "All Clients" && s.client_name !== client) return false;
      if (portfolio !== "All Portfolios" && s.portfolio_name !== portfolio) return false;
      if (status !== "All Statuses" && s.status !== status) return false;
      if (term) {
        const hay = [s.name, s.summary, s.client_name, s.portfolio_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [strategies, client, portfolio, status, search]);

  return (
    <>
      <PageHeader
        title="Strategies / Workflows"
        description="PayFlow proposes a strategy from collection data and case context — and a person can create one too. Every strategy is reviewed and approved before it runs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {summary.ai_proposed > 0 && (
              <StatusPill tone="ai" dot>
                {summary.ai_proposed} awaiting review
              </StatusPill>
            )}
            <Link to="/payflow/workflows/new">
              <Btn variant="primary">Create workflow</Btn>
            </Link>
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
          options={["All Statuses", ...statuses]}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading workflows…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No strategies match these filters"
          description="Adjust the client, portfolio or status filter to see proposed and approved strategies."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => (
            <Link
              key={s.id}
              to={`/payflow/workflows/${s.id}`}
              className="group rounded-xl border border-border/80 bg-card px-4 py-4 shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-panel"
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

              <div className="mt-3 flex flex-wrap gap-1">
                {(s.steps || []).slice(0, 6).map((step, i) => (
                  <span
                    key={step.id || `${step.kind}-${i}`}
                    className="rounded-md border border-border/70 bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {step.kind}
                  </span>
                ))}
                {(s.steps || []).length > 6 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{(s.steps || []).length - 6}
                  </span>
                )}
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
                <StatusPill tone={s.origin === "AI Proposed" ? "ai" : "info"}>
                  {s.origin}
                </StatusPill>
                <StatusPill>v{s.version}</StatusPill>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[11.5px] text-muted-foreground">
                <span>{s.coverage || "Targeted segment"}</span>
                <span>{s.last_updated_label ? `Updated ${s.last_updated_label}` : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
