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

export function PayFlowIntegrationsPage() {
  const [fields, setFields] = useState<PayflowMappingCatalogField[]>([]);
  const [outbound, setOutbound] = useState<PayflowMappingOutboundField[]>([]);
  const [version, setVersion] = useState<string>("");
  const [group, setGroup] = useState("All groups");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getPayflowClientMappingCatalog()
      .then((res) => {
        if (cancelled) return;
        setFields(res.fields || []);
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

  const groups = useMemo(() => {
    const set = new Set(fields.map((f) => f.group).filter(Boolean));
    return ["All groups", ...Array.from(set)];
  }, [fields]);

  const filtered = useMemo(() => {
    if (group === "All groups") return fields;
    return fields.filter((f) => f.group === group);
  }, [fields, group]);

  const mappedCount = fields.filter(
    (f) => f.payflow_field && f.payflow_field !== "— Not mapped —",
  ).length;
  const requiredCount = fields.filter((f) => f.required).length;

  return (
    <>
      <PageHeader
        title="System Mapping"
        description="One global CRM → PayFlow field mapping for all clients. Client onboarding uses daily file upload; this catalog shows how CRM source fields map into PayFlow."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Inbound fields" value={String(fields.length)} />
        <KpiCard label="Mapped targets" value={String(mappedCount)} />
        <KpiCard label="Required fields" value={String(requiredCount)} />
        <KpiCard label="Catalog version" value={version || "—"} />
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      <Panel
        title="CRM inbound → PayFlow"
        description="Shared across every client. After this mapping, daily account/reminder files are uploaded per client. “Optional” = not in the current CRM feed; add that column to the daily file only if available."
        action={
          <FilterSelect label="Group" value={group} options={groups} onChange={setGroup} />
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading system mapping…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No mapping fields"
            description="The CRM field catalog is empty or filtered out."
          />
        ) : (
          <DataTable
            minWidth={880}
            head={["Group", "CRM / source field", "PayFlow field", "Required", "Available", "Sample"]}
          >
            {filtered.map((f) => (
              <Tr key={`${f.group}-${f.source_field}-${f.payflow_field}`}>
                <Td className="align-top text-muted-foreground">
                  <div className="w-[8.5rem] whitespace-normal">{f.group}</div>
                </Td>
                <Td className="align-top">
                  {/* Inner wrap: Td defaults to whitespace-nowrap (no twMerge). */}
                  <div className="max-w-[22rem] whitespace-normal">
                    <span className="font-medium text-foreground">{f.source_field}</span>
                    {f.meaning ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {f.meaning}
                      </p>
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
                  <StatusPill tone={availableTone(f.available)}>
                    {f.available || "—"}
                  </StatusPill>
                </Td>
                <Td className="tabular text-muted-foreground">
                  <div className="max-w-[9rem] truncate" title={f.sample_value || undefined}>
                    {f.sample_value || "—"}
                  </div>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </Panel>

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
