import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listPayflowImports } from "../../api/payflow";
import {
  DataTable,
  FilterSelect,
  PageHeader,
  StatusPill,
  Td,
  Tr,
  PrimaryCell,
} from "../../components/payflow/lovable/payflow-ui";
import {
  formatNumber,
  importKindLabel,
  importStatusTone,
  mapApiImportRun,
  normalizeImportCounts,
  type ImportKind,
  type ImportRun,
} from "../../lib/import-data";

const typeOptions = ["All Import Types", importKindLabel.client, importKindLabel.account];

export function PayFlowImportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("type");
  const type: ImportKind | undefined = raw === "client" || raw === "account" ? raw : undefined;
  const [rows, setRows] = useState<ImportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const back =
    type === "client"
      ? { to: "/payflow/clients", label: "Clients" }
      : { to: "/payflow/cases", label: "Accounts / Cases" };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listPayflowImports(type ? { type } : undefined)
      .then((res) => {
        if (!cancelled) setRows((res.imports || []).map(mapApiImportRun));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load imports");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: back.label, to: back.to }, { label: "Import History" }]}
        title="Import History"
        description="Every CRM file uploaded to PayFlow, with its reconciliation results."
      />
      <div className="mb-4">
        <FilterSelect
          label="Type"
          value={type ? importKindLabel[type] : typeOptions[0]!}
          onChange={(v) => {
            if (v === importKindLabel.client) setSearchParams({ type: "client" });
            else if (v === importKindLabel.account) setSearchParams({ type: "account" });
            else setSearchParams({});
          }}
          options={typeOptions}
        />
      </div>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading import history…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No imports have been processed yet.</p>
      ) : null}
      {!loading && rows.length > 0 ? (
        <DataTable
          minWidth={1180}
          head={[
            "File Name",
            "Date / Time",
            "Import Type",
            "Total",
            "Successful",
            "Created",
            "Updated",
            "Unchanged",
            "Rejected",
            "Failed",
            "Status",
            "",
          ]}
        >
          {rows.map((r) => {
            const c = normalizeImportCounts(r.counts, r.errors);
            return (
            <Tr key={r.id}>
              <Td>
                <PrimaryCell title={r.fileName} subtitle={`By ${r.uploadedBy}`} />
              </Td>
              <Td className="text-muted-foreground">{r.dateTime}</Td>
              <Td>{importKindLabel[r.kind]}</Td>
              <Td className="tabular">{formatNumber(c.total)}</Td>
              <Td className="tabular">{formatNumber(c.successful)}</Td>
              <Td className="tabular">{formatNumber(c.created)}</Td>
              <Td className="tabular">{formatNumber(c.updated)}</Td>
              <Td className="tabular">{formatNumber(c.unchanged)}</Td>
              <Td className="tabular">{formatNumber(c.rejected)}</Td>
              <Td className="tabular">{formatNumber(c.failed)}</Td>
              <Td>
                <StatusPill tone={importStatusTone(r.status)}>{r.status}</StatusPill>
              </Td>
              <Td>
                <div className="flex gap-3 text-[12.5px] font-semibold text-primary">
                  <Link to={`/payflow/imports/${r.id}`} className="hover:underline">
                    View Details
                  </Link>
                  {r.errors.length > 0 && (
                    <Link to={`/payflow/imports/${r.id}?errors=1`} className="hover:underline">
                      View Errors
                    </Link>
                  )}
                </div>
              </Td>
            </Tr>
            );
          })}
        </DataTable>
      ) : null}
    </>
  );
}
