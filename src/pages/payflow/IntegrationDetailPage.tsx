import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getPayflowIntegration, testPayflowIntegration } from "../../api/payflow";
import {
  Btn,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  StatusPill,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import type { PayflowIntegration } from "../../types";

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

function mappingTone(status: string): Tone {
  switch (status) {
    case "Mapped":
    case "Validated":
      return "success";
    case "Needs Attention":
      return "warning";
    default:
      return "neutral";
  }
}

export function PayFlowIntegrationDetailPage() {
  const { integrationId } = useParams<{ integrationId: string }>();
  const { isOperationsAdmin } = usePayFlowAccess();
  const [integration, setIntegration] = useState<PayflowIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testedMessage, setTestedMessage] = useState("");
  const [showMapping, setShowMapping] = useState(false);

  useEffect(() => {
    if (!integrationId) {
      setError("Integration not found");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setTestedMessage("");
    getPayflowIntegration(integrationId)
      .then((res) => {
        if (!cancelled) setIntegration(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load integration");
          setIntegration(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [integrationId]);

  async function runTest() {
    if (!integrationId) return;
    setTesting(true);
    setTestedMessage("");
    try {
      const res = await testPayflowIntegration(integrationId);
      setTestedMessage(res.message);
    } catch (err) {
      setTestedMessage(err instanceof ApiError ? err.detail : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading integration…</p>;
  }

  if (error || !integration) {
    return (
      <Panel title="Integration not available">
        <p className="text-sm text-muted-foreground">
          {error ||
            "This integration either does not exist or belongs to a client outside your access."}
        </p>
        <Link
          to="/payflow/integrations"
          className="mt-3 inline-block text-[13px] font-medium text-primary"
        >
          Back to integrations
        </Link>
      </Panel>
    );
  }

  const facts: [string, string][] = [
    ["Integration", integration.name],
    ["Category", integration.category],
    ["Client", integration.client_name],
    ["Connection status", testing ? "Testing" : integration.status],
    ["Last successful activity", integration.last_successful ?? "No activity recorded yet"],
    ["Last activity", integration.last_activity],
  ];

  const summary = integration.mapping_summary;
  const mappings = integration.mappings || [];

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Integrations", to: "/payflow/integrations" },
          { label: `${integration.name} · ${integration.client_name}` },
        ]}
        title={`${integration.name} Integration`}
        description={integration.purpose}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={integrationTone(testing ? "Testing" : integration.status)}>
              {testing ? "Testing" : integration.status}
            </StatusPill>
            <StatusPill>{integration.client_name}</StatusPill>
          </div>
        }
      />

      {integration.status === "Attention Required" ? (
        <div className="mb-5 rounded-lg border border-destructive/25 bg-destructive/8 p-4">
          <p className="text-[13px] font-semibold text-foreground">
            {integration.name} connection requires attention
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {integration.client_name} · last successful activity{" "}
            {integration.last_successful ?? "unknown"}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Connection" description="Operational status of this connection">
          <dl className="divide-y divide-border">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-[13px] text-muted-foreground">{label}</dt>
                <dd className="text-[13px] font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          {isOperationsAdmin ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn onClick={() => void runTest()} disabled={testing}>
                {testing ? "Testing…" : "Test Connection"}
              </Btn>
              {integration.data_source ? (
                <Btn variant="ghost" onClick={() => setShowMapping((v) => !v)}>
                  {showMapping ? "Hide Mapping" : "View Mapping"}
                </Btn>
              ) : null}
              {integration.client_id ? (
                <Link to={`/payflow/clients/${integration.client_id}`}>
                  <Btn variant="ghost">
                    {integration.status === "Connected" ? "Configure" : "Reconnect / Configure"}
                  </Btn>
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-[12px] text-muted-foreground">
              Configuration actions are available to Operations Admin only.
            </p>
          )}
          {testedMessage ? (
            <p className="mt-2 text-[12px] text-success">{testedMessage}</p>
          ) : null}
        </Panel>

        <Panel title="Recent Issues" description="Operational events needing attention">
          {(integration.issues || []).length === 0 ? (
            <EmptyState
              title="No recent issues"
              description="This connection has operated normally over the recent period."
            />
          ) : (
            <ul className="space-y-2">
              {integration.issues.map((issue) => (
                <li
                  key={`${issue.at}-${issue.summary}`}
                  className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2"
                >
                  <p className="text-[13px] text-foreground">{issue.summary}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{issue.at}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {integration.data_source && summary ? (
        <Panel
          className="mt-5"
          title="Data Mapping Status"
          description={`The same mapping configured during ${integration.client_name} onboarding`}
          action={
            integration.client_id ? (
              <Link
                to={`/payflow/clients/${integration.client_id}`}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Open client configuration
              </Link>
            ) : undefined
          }
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusPill tone="success">{summary.mapped} mapped</StatusPill>
            <StatusPill tone={summary.attention ? "warning" : "neutral"}>
              {summary.attention} need attention
            </StatusPill>
            <StatusPill>{summary.total} source fields</StatusPill>
          </div>
          {showMapping ? (
            mappings.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                No field mappings configured for this client yet.
              </p>
            ) : (
              <DataTable minWidth={620} head={["Source Field", "PayFlow Field", "Sample Value", "Status"]}>
                {mappings.map((m) => (
                  <Tr key={m.source_field}>
                    <Td>{m.source_field}</Td>
                    <Td className="text-muted-foreground">{m.payflow_field || "—"}</Td>
                    <Td className="text-muted-foreground">{m.sample_value || "—"}</Td>
                    <Td>
                      <StatusPill tone={mappingTone(m.status)}>{m.status}</StatusPill>
                    </Td>
                  </Tr>
                ))}
              </DataTable>
            )
          ) : (
            <p className="text-[12px] text-muted-foreground">
              Use View Mapping to inspect source → PayFlow field mappings.
            </p>
          )}
        </Panel>
      ) : null}
    </>
  );
}
