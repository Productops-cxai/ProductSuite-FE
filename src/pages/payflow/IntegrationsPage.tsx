import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowClients, listPayflowIntegrations } from "../../api/payflow";
import {
  DataTable,
  EmptyState,
  FilterSelect,
  KpiCard,
  PageHeader,
  Panel,
  PrimaryCell,
  SectionHeading,
  StatusPill,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import type {
  PayflowClient,
  PayflowIntegration,
  PayflowIntegrationsSummary,
} from "../../types";

function integrationTone(status: string): Tone {
  switch (status) {
    case "Connected":
      return "success";
    case "Attention Required":
      return "danger";
    case "Configuration Pending":
      return "warning";
    case "Testing":
      return "info";
    default:
      return "neutral";
  }
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Data Source": "Each client uses one primary operational data source: CRM or ACE.",
  Communication: "Channel connections used to execute customer communications.",
  Payments:
    "Payment provider is not finalised; the customer payment experience stays provider neutral.",
  Future: "Not active yet.",
};

export function PayFlowIntegrationsPage() {
  const { isOperationsAdmin } = usePayFlowAccess();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "All Statuses";

  const [integrations, setIntegrations] = useState<PayflowIntegration[]>([]);
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [summary, setSummary] = useState<PayflowIntegrationsSummary>({
    connected: 0,
    attention: 0,
    pending: 0,
    disconnected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState(initialStatus);
  const [client, setClient] = useState("All Clients");
  const [category, setCategory] = useState("All Categories");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([listPayflowIntegrations({}), listPayflowClients({})])
      .then(([intRes, clientRes]) => {
        if (cancelled) return;
        setIntegrations(intRes.integrations || []);
        setSummary(intRes.summary);
        setCategories(intRes.categories || []);
        setStatuses(intRes.statuses || []);
        setClients(clientRes.clients || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load integrations");
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
    return integrations.filter((i) => {
      if (status !== "All Statuses" && i.status !== status) return false;
      if (client !== "All Clients" && i.client_name !== client) return false;
      if (category !== "All Categories" && i.category !== category) return false;
      return true;
    });
  }, [integrations, status, client, category]);

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Monitor the external systems and services connected to PayFlow."
        actions={
          isOperationsAdmin ? undefined : (
            <StatusPill>Operational status only for your assigned clients</StatusPill>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Connected" value={String(summary.connected)} tone="primary" />
        <KpiCard label="Attention Required" value={String(summary.attention)} />
        <KpiCard label="Configuration Pending" value={String(summary.pending)} />
        <KpiCard label="Disconnected" value={String(summary.disconnected)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All Statuses", ...statuses]}
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
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading integrations…</p> : null}

      {!loading && !error ? (
        <div className="space-y-6">
          {categories.map((cat) => {
            const catRows = rows.filter((i) => i.category === cat);
            if (catRows.length === 0) return null;
            return (
              <div key={cat}>
                <SectionHeading
                  title={cat === "Future" ? "Future Channels" : cat}
                  description={CATEGORY_DESCRIPTIONS[cat]}
                />
                <DataTable
                  minWidth={820}
                  head={["Integration", "Category", "Client", "Status", "Last Activity", ""]}
                >
                  {catRows.map((i) => (
                    <Tr key={i.id}>
                      <Td>
                        <Link to={`/payflow/integrations/${encodeURIComponent(i.id)}`}>
                          <PrimaryCell
                            title={i.name}
                            subtitle={i.data_source ? "Primary data source" : undefined}
                          />
                        </Link>
                      </Td>
                      <Td className="text-muted-foreground">{i.category}</Td>
                      <Td>
                        {i.client_id ? (
                          <Link
                            to={`/payflow/clients/${i.client_id}`}
                            className="hover:underline"
                          >
                            {i.client_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{i.client_name}</span>
                        )}
                      </Td>
                      <Td>
                        <StatusPill tone={integrationTone(i.status)}>{i.status}</StatusPill>
                      </Td>
                      <Td className="tabular text-muted-foreground">{i.last_activity}</Td>
                      <Td>
                        <Link
                          to={`/payflow/integrations/${encodeURIComponent(i.id)}`}
                          className="text-[13px] font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </DataTable>
              </div>
            );
          })}

          {rows.length === 0 ? (
            <Panel title="Integrations">
              <EmptyState
                title="No integrations match these filters"
                description="Clear the status, client or category filter to see all connected systems."
              />
            </Panel>
          ) : null}

          {summary.attention === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              No recent integration issues across your clients.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
