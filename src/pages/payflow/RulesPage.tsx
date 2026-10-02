import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowRules } from "../../api/payflow";
import {
  Btn,
  DataTable,
  FilterSelect,
  KpiCard,
  PageHeader,
  PrimaryCell,
  SearchInput,
  StatusPill,
  TabBar,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import type { PayflowClient, PayflowRule, PayflowRulesSummary } from "../../types";

function ruleStatusTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "Draft") return "warning";
  return "neutral";
}

export function PayFlowRulesPage() {
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

  const rows = useMemo(() => {
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

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Rules" value={String(summary.active)} tone="primary" />
        <KpiCard label="System Rules" value={String(summary.system)} />
        <KpiCard label="Client Rules" value={String(summary.client)} />
        <KpiCard label="Triggers · last 7 days" value={String(summary.triggers_7d)} />
      </div>

      <TabBar
        tabs={["All Rules", "System Rules", "Client Rules"] as const}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search rules…" />
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
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading rules…</p> : null}

      {!loading && !error ? (
        <>
          <DataTable
            minWidth={960}
            head={[
              "Rule Name",
              "Type",
              "Client / Scope",
              "Category",
              "Condition Summary",
              "Result",
              "Status",
              "Last Updated",
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
              </Tr>
            ))}
          </DataTable>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No rules match these filters.</p>
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
