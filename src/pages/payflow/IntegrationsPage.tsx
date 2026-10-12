import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import { getPayflowClientMappingCatalog } from "../../api/payflow";
import {
  DataTable,
  EmptyState,
  FilterSelect,
  KpiCard,
  PageHeader,
  Panel,
  SectionHeading,
  StatusPill,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import type { PayflowMappingCatalogField, PayflowMappingOutboundField } from "../../types";

function availableTone(available?: string): Tone {
  switch ((available || "").trim()) {
    case "Yes":
    case "Derived":
    case "PayFlow-built":
      return "success";
    case "Partial":
    case "Ambiguous":
      return "warning";
    case "No":
      return "danger";
    case "Optional":
      return "neutral";
    default:
      return "neutral";
  }
}

function MappingFieldsTable({
  fields,
  emptyTitle,
  emptyDescription,
}: {
  fields: PayflowMappingCatalogField[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (fields.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <DataTable
      minWidth={880}
      head={["Group", "CRM / source field", "PayFlow field", "Required", "Available", "Sample"]}
    >
      {fields.map((f) => (
        <Tr key={`${f.feed || "map"}-${f.group}-${f.source_field}-${f.payflow_field}`}>
          <Td className="align-top text-muted-foreground">
            <div className="w-[8.5rem] whitespace-normal">{f.group}</div>
          </Td>
          <Td className="align-top">
            <div className="max-w-[22rem] whitespace-normal">
              <span className="font-medium text-foreground">{f.source_field}</span>
              {f.meaning ? (
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{f.meaning}</p>
              ) : null}
            </div>
          </Td>
          <Td className="align-top font-medium text-foreground">
            <div className="w-[10.5rem] whitespace-normal">{f.payflow_field || "—"}</div>
          </Td>
          <Td>
            <StatusPill tone={f.required ? "warning" : "neutral"}>
              {f.required ? "Required" : "Optional"}
            </StatusPill>
          </Td>
          <Td>
            <StatusPill tone={availableTone(f.available)}>{f.available || "—"}</StatusPill>
          </Td>
          <Td className="tabular text-muted-foreground">
            <div className="max-w-[9rem] truncate" title={f.sample_value || undefined}>
              {f.sample_value || "—"}
            </div>
          </Td>
        </Tr>
      ))}
    </DataTable>
  );
}

export function PayFlowIntegrationsPage() {
  const [accountFields, setAccountFields] = useState<PayflowMappingCatalogField[]>([]);
  const [clientFields, setClientFields] = useState<PayflowMappingCatalogField[]>([]);
  const [outbound, setOutbound] = useState<PayflowMappingOutboundField[]>([]);
  const [version, setVersion] = useState<string>("");
  const [accountGroup, setAccountGroup] = useState("All groups");
  const [clientGroup, setClientGroup] = useState("All groups");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getPayflowClientMappingCatalog()
      .then((res) => {
        if (cancelled) return;
        const accounts = res.account_fields?.length
          ? res.account_fields
          : (res.fields || []).filter((f) => (f.feed || "daily_accounts") !== "client_hierarchy");
        const clients = res.client_fields?.length
          ? res.client_fields
          : (res.fields || []).filter((f) => f.feed === "client_hierarchy");
        setAccountFields(accounts);
        setClientFields(clients);
        setOutbound(res.outbound_fields || []);
        setVersion(res.catalog_version || "");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load system mapping");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const accountGroups = useMemo(() => {
    const set = new Set(accountFields.map((f) => f.group).filter(Boolean));
    return ["All groups", ...Array.from(set)];
  }, [accountFields]);

  const clientGroups = useMemo(() => {
    const set = new Set(clientFields.map((f) => f.group).filter(Boolean));
    return ["All groups", ...Array.from(set)];
  }, [clientFields]);

  const filteredAccounts = useMemo(() => {
    if (accountGroup === "All groups") return accountFields;
    return accountFields.filter((f) => f.group === accountGroup);
  }, [accountFields, accountGroup]);

  const filteredClients = useMemo(() => {
    if (clientGroup === "All groups") return clientFields;
    return clientFields.filter((f) => f.group === clientGroup);
  }, [clientFields, clientGroup]);

  const totalFields = accountFields.length + clientFields.length;
  const mappedCount = [...accountFields, ...clientFields].filter(
    (f) => f.payflow_field && f.payflow_field !== "— Not mapped —",
  ).length;
  const requiredCount = [...accountFields, ...clientFields].filter((f) => f.required).length;

  return (
    <>
      <PageHeader
        title="System Mapping"
        description="One global CRM → PayFlow field mapping for all clients. Client hierarchy and daily account files are listed separately so source columns stay clear."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Inbound fields" value={String(totalFields)} />
        <KpiCard label="Mapped targets" value={String(mappedCount)} />
        <KpiCard label="Required fields" value={String(requiredCount)} />
        <KpiCard label="Catalog version" value={version || "—"} />
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading system mapping…</p>
      ) : (
        <>
          <Panel
            title="Client file → PayFlow"
            description="Columns from the CRM clients / hierarchy upload (masters and sub-clients). Used when onboarding or refreshing the Client → Sub-Client tree."
            action={
              <FilterSelect
                label="Group"
                value={clientGroup}
                options={clientGroups}
                onChange={setClientGroup}
              />
            }
          >
            <MappingFieldsTable
              fields={filteredClients}
              emptyTitle="No client-file mappings"
              emptyDescription="No client hierarchy fields in the catalog."
            />
          </Panel>

          <div className="mt-5">
            <Panel
              title="Accounts file → PayFlow"
              description="Columns from the daily CRM accounts / debtor file. After this mapping, account files are uploaded per client. “Optional” = not always present; add that column only when available."
              action={
                <FilterSelect
                  label="Group"
                  value={accountGroup}
                  options={accountGroups}
                  onChange={setAccountGroup}
                />
              }
            >
              <MappingFieldsTable
                fields={filteredAccounts}
                emptyTitle="No account-file mappings"
                emptyDescription="No daily account fields in the catalog."
              />
            </Panel>
          </div>
        </>
      )}

      {outbound.length > 0 ? (
        <div className="mt-5">
          <SectionHeading
            title="Outbound reference"
            description="CRM remittance / status files PayFlow may produce later (documentation)."
          />
          <Panel title="Outbound fields" className="mt-3">
            <DataTable minWidth={880} head={["File", "Field", "Meaning", "Required", "Format"]}>
              {outbound.map((o) => (
                <Tr key={`${o.file}-${o.field}`}>
                  <Td className="text-muted-foreground">{o.file}</Td>
                  <Td className="font-medium">{o.field}</Td>
                  <Td className="text-muted-foreground">{o.meaning}</Td>
                  <Td>
                    <StatusPill tone={o.required ? "warning" : "neutral"}>
                      {o.required ? "Required" : "Optional"}
                    </StatusPill>
                  </Td>
                  <Td className="text-muted-foreground">{o.format || "—"}</Td>
                </Tr>
              ))}
            </DataTable>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
