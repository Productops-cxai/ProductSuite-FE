import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getPayflowImport } from "../../api/payflow";
import { ImportErrorTable, ImportResult } from "../../components/payflow/import-flow";
import { Btn, PageHeader, Panel } from "../../components/payflow/lovable/payflow-ui";
import { importKindLabel, mapApiImportRun, type ImportRun } from "../../lib/import-data";

export function PayFlowImportDetailPage() {
  const { importId } = useParams<{ importId: string }>();
  const [searchParams] = useSearchParams();
  const [run, setRun] = useState<ImportRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!importId) {
      setError("Import not found");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPayflowImport(importId)
      .then((res) => {
        if (!cancelled) setRun(mapApiImportRun(res));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Import not found");
          setRun(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [importId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading import…</p>;
  }

  if (error || !run) {
    return (
      <Panel title="Import not found">
        <p className="mb-3 text-[13px] text-muted-foreground">{error}</p>
        <Link to="/payflow/imports" className="text-[13px] font-medium text-primary">
          Back to Import History
        </Link>
      </Panel>
    );
  }

  const back = run.kind === "client" ? "/payflow/clients" : "/payflow/cases";
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Import History", to: "/payflow/imports" }, { label: run.fileName }]}
        title="Import Details"
        description={`${importKindLabel[run.kind]} · uploaded by ${run.uploadedBy}`}
      />
      <ImportResult
        run={run}
        initialShowErrors={searchParams.get("errors") === "1"}
        returnTo={
          <Link to={back}>
            <Btn variant="primary">Return to {run.kind === "client" ? "Clients" : "Accounts"}</Btn>
          </Link>
        }
      />
      <div className="mt-6">
        <h2 className="mb-3 text-[15px] font-semibold text-foreground">Errors &amp; Validation Details</h2>
        <ImportErrorTable errors={run.errors} />
      </div>
    </>
  );
}
