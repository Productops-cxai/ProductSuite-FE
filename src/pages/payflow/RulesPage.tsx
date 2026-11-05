import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowRules } from "../../api/payflow";
import {
  Btn,
  DataTable,
  FilterBar,
  FilterSelect,
  KpiCard,
  KpiGrid,
  PageHeader,
  PrimaryCell,
  SearchInput,
  StatusPill,
  TabBar,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { MobileRecordCard, MobileRecordCards } from "../../components/ui/MobileRecordCards";
import { Pagination } from "../../components/ui/Pagination";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useClientPagedList } from "../../hooks/useOffsetPagination";
import type { PayflowClient, PayflowRule, PayflowRulesSummary } from "../../types";

const PAGE_SIZE = 10;

function ruleStatusTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "Draft") return "warning";
  return "neutral";
}

export function PayFlowRulesPage() {
  const isMobile = useIsMobile();
  const [rules, setRules] = useState<PayflowRule[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [summary, setSummary] = useState<PayflowRulesSummary>({
    active: 0,
    system: 0,
    client: 0,
    triggers_7d: 0,
  });
  const [canCreate, setCanCreate] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<"All Rules" | "System Rules" | "Client Rules">("All Rules");
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("All Clients");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Statuses");
  const [action, setAction] = useState("All Actions");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listPayflowRules({}), listPayflowClients({})])
      .then(([ruleRes, clientRes]) => {
        if (cancelled) return;
        setRules(ruleRes.rules || []);
        setSummary(ruleRes.summary);
        setCanCreate(!!ruleRes.can_create);
        setCategories(ruleRes.categories || []);
        setActions(ruleRes.actions || []);
        setStatuses(ruleRes.statuses || []);
        setClients(clientRes.clients || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load rules");
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
    const term = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (tab === "System Rules" && r.rule_type !== "System Rule") return false;
      if (tab === "Client Rules" && r.rule_type !== "Client Rule") return false;
      if (client !== "All Clients") {
        if (r.client_name !== client && !(r.rule_type === "System Rule")) return false;
      }
      if (category !== "All Categories" && r.category !== category) return false;
      if (status !== "All Statuses" && r.status !== status) return false;
      if (action !== "All Actions" && r.action !== action) return false;
      if (term) {
        const hay = [r.name, r.description, r.action, r.condition_summary]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rules, tab, client, category, status, action, search]);

  const filterKey = `${tab}|${search}|${client}|${category}|${status}|${action}`;
  const { pageItems: rows, total, offset, pageSize, goPrev, goNext } = useClientPagedList(
    filtered,
    PAGE_SIZE,
    filterKey,
  );

  return (
    <>
      <PageHeader
        title="Rules"
        description="Governance rules that decide when collection actions require review, hold or escalation."
        actions={
          canCreate ? (
            <Link to="/payflow/rules/new">
              <Btn variant="primary">Create Rule</Btn>
            </Link>
          ) : (
            <StatusPill>Read-only access</StatusPill>
          )
        }
      />

      <KpiGrid>
        <KpiCard label="Active Rules" value={String(summary.active)} tone="primary" />
        <KpiCard label="System Rules" value={String(summary.system)} />
        <KpiCard label="Client Rules" value={String(summary.client)} />
        <KpiCard label="Triggers · last 7 days" value={String(summary.triggers_7d)} />
      </KpiGrid>

      <TabBar
        tabs={["All Rules", "System Rules", "Client Rules"] as const}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search rules…"
          className="w-full md:col-span-2 xl:w-64"
        />
        <FilterSelect
          label="Client"
          value={client}
          onChange={setClient}
          options={["All Clients", ...clients.map((c) => c.name)]}
        />
        <FilterSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={["All Categories", ...categories]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...statuses]}
        />
        <FilterSelect
          label="Action"
          value={action}
          onChange={setAction}
          options={["All Actions", ...actions]}
        />
      </FilterBar>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading rules…</p> : null}

      {!loading && !error ? (
        <>
          {filtered.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No rules match these filters.</p>
          ) : isMobile ? (
            <MobileRecordCards>
              {rows.map((r) => (
                <MobileRecordCard
                  key={r.id}
                  to={`/payflow/rules/${r.id}`}
                  title={r.name}
                  subtitle={r.action}
                  badges={
                    <StatusPill tone={ruleStatusTone(r.status)}>{r.status}</StatusPill>
                  }
                  meta={
                    <div className="space-y-0.5">
                      <p>
                        {r.rule_type} · {r.client_name || "All Clients"}
                      </p>
                      <p>{r.category}</p>
                      {r.condition_summary ? <p className="truncate">{r.condition_summary}</p> : null}
                      <p>Updated {r.last_updated_label || "—"}</p>
                    </div>
                  }
                  footer={
                    r.can_edit ? (
                      <Link
                        to={`/payflow/rules/${r.id}/edit`}
                        className="text-[12.5px] font-semibold text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                    ) : undefined
                  }
                />
              ))}
            </MobileRecordCards>
          ) : (
            <DataTable
              minWidth={1080}
              head={[
                "Rule Name",
                "Type",
                "Client / Scope",
                "Category",
                "Condition Summary",
                "Result",
                "Status",
                "Last Updated",
                "Action",
              ]}
            >
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link to={`/payflow/rules/${r.id}`}>
                      <PrimaryCell title={r.name} subtitle={r.action} />
                    </Link>
                  </Td>
                  <Td className="text-muted-foreground">{r.rule_type}</Td>
                  <Td className="text-muted-foreground">
                    {r.client_name || "All Clients"}
                  </Td>
                  <Td className="text-muted-foreground">{r.category}</Td>
                  <Td className="max-w-[240px] truncate text-muted-foreground">
                    {r.condition_summary || "—"}
                  </Td>
                  <Td className="text-muted-foreground">{r.action}</Td>
                  <Td>
                    <StatusPill tone={ruleStatusTone(r.status)}>{r.status}</StatusPill>
                  </Td>
                  <Td className="tabular text-muted-foreground">
                    {r.last_updated_label || "—"}
                  </Td>
                  <Td>
                    {r.can_edit ? (
                      <Link to={`/payflow/rules/${r.id}/edit`}>
                        <Btn variant="ghost" className="text-primary hover:text-primary">
                          Edit
                        </Btn>
                      </Link>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </DataTable>
          )}
          {filtered.length > 0 ? (
            <Pagination
              total={total}
              offset={offset}
              pageSize={pageSize}
              rowCount={rows.length}
              onPrevious={goPrev}
              onNext={goNext}
            />
          ) : null}
          <p className="mt-4 text-[12px] text-muted-foreground">
            Autopilot clients execute matching actions automatically. Supervised AI clients may still
            route high-impact results into Human Review.
          </p>
        </>
      ) : null}
    </>
  );
}
