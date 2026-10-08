import { Link, useNavigate } from "react-router-dom";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Btn,
  DataTable,
  KpiCard,
  Panel,
  PrimaryCell,
  StatusPill,
  Td,
  Tr,
} from "./lovable/payflow-ui";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../api/client";
import {
  downloadPayflowAccountImportTemplate,
  listPayflowImports,
  uploadPayflowAccountImport,
  uploadPayflowClientsBulk,
  validatePayflowAccountImport,
  validatePayflowClientsBulk,
} from "../../api/payflow";
import type { PayflowBulkUploadResult, PayflowImportPreviewResponse } from "../../types";
import {
  acceptedTypes,
  actionTone,
  addImport,
  formatCurrency,
  formatFileSize,
  formatNumber,
  importStatusTone,
  lastImport,
  lastSuccessfulImport,
  mapApiImportRun,
  type ImportAction,
  type ImportError,
  type ImportKind,
  type ImportRecord,
  type ImportRun,
  type ImportStatus,
} from "../../lib/import-data";

type Stage = "upload" | "uploading" | "validating" | "preview" | "processing" | "done";

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m10.3 4.3-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-2.7l-8-14a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}
function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 14.9A7 7 0 0 1 15.1 7h.9a5 5 0 0 1 0 10h-1" />
      <path d="M12 12v9" />
      <path d="m8 16 4-4 4 4" />
    </svg>
  );
}
function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  );
}

export function FileDropzone({
  file,
  onFile,
  error,
  accept = acceptedTypes,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  error?: string | null;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pick = () => inputRef.current?.click();

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={pick}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            onFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors sm:py-12",
            over ? "border-primary bg-primary/5" : "border-border-strong/60 bg-muted/30 hover:border-primary/50",
          )}
        >
          <UploadCloudIcon className="mb-3 size-8 text-primary" />
          <p className="text-[14px] font-semibold text-foreground">Drag & drop your file here</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            or <span className="font-semibold text-primary">browse to select a file</span>
          </p>
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            Supported: {accept.includes("csv") ? "CSV or XLSX" : "XLSX"} · up to 50 MB
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileTextIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-foreground">{file.name}</p>
            <p className="text-[11.5px] text-muted-foreground">{formatFileSize(file.size)} · Ready to validate</p>
          </div>
          <div className="flex gap-2">
            <Btn onClick={pick}>Replace</Btn>
            <Btn variant="ghost" onClick={() => onFile(null)}>
              Remove
            </Btn>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-[12.5px] font-medium text-destructive">{error}</p>}
    </div>
  );
}

function ProgressPanel({ title, done, total, unit }: { title: string; done: number; total: number; unit: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <Panel>
      <div className="flex flex-col items-center px-2 py-10 text-center">
        <LoaderIcon className="mb-3 size-8 animate-spin text-primary" />
        <h2 className="font-display text-[18px] font-semibold text-foreground">{title}</h2>
        <p className="tabular mt-1 text-[13px] text-muted-foreground">
          {total ? `${formatNumber(done)} of ${formatNumber(total)} ${unit} processed` : "Please keep this page open."}
        </p>
        <div className="mt-5 h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${total ? pct : 40}%` }} />
        </div>
        {total > 0 && <p className="tabular mt-2 text-[11.5px] text-muted-foreground">{pct}%</p>}
      </div>
    </Panel>
  );
}

const stageLabels = ["Upload", "Validate & Preview", "Process", "Results"];
function stageIndex(stage: Stage) {
  if (stage === "upload" || stage === "uploading") return 0;
  if (stage === "validating" || stage === "preview") return 1;
  if (stage === "processing") return 2;
  return 3;
}
function StageBar({ stage }: { stage: Stage }) {
  const idx = stageIndex(stage);
  return (
    <ol className="mb-6 flex flex-wrap gap-2">
      {stageLabels.map((l, i) => (
        <li
          key={l}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium",
            i < idx && "border-success/30 bg-success/10 text-success",
            i === idx && "border-primary/40 bg-primary/10 text-primary",
            i > idx && "border-border text-muted-foreground",
          )}
        >
          <span className="tabular">{i + 1}</span> {l}
        </li>
      ))}
    </ol>
  );
}

export function ImportErrorTable({ errors }: { errors: ImportError[] }) {
  if (errors.length === 0)
    return <p className="text-[13px] text-muted-foreground">No errors were found in this import.</p>;
  return (
    <DataTable minWidth={860} head={["Record", "Client", "Sub-Client", "Field", "What needs fixing", "Status"]}>
      {errors.map((e, i) => (
        <Tr key={i}>
          <Td className="tabular font-medium">{e.recordId}</Td>
          <Td>{e.client}</Td>
          <Td className="text-muted-foreground">{e.subClient}</Td>
          <Td>{e.field}</Td>
          <Td className="min-w-[280px] whitespace-normal">{e.error}</Td>
          <Td>
            <StatusPill tone={e.status === "Rejected" ? "danger" : "warning"}>{e.status}</StatusPill>
          </Td>
        </Tr>
      ))}
    </DataTable>
  );
}

export function ImportResult({
  run,
  returnTo,
  initialShowErrors = false,
}: {
  run: ImportRun;
  returnTo: ReactNode;
  initialShowErrors?: boolean;
}) {
  const [showErrors, setShowErrors] = useState(initialShowErrors);
  const Icon = run.status === "Completed" ? CheckCircleIcon : run.status === "Failed" ? XCircleIcon : AlertTriangleIcon;
  const iconTone =
    run.status === "Completed" ? "text-success" : run.status === "Failed" ? "text-destructive" : "text-warning";
  const heading =
    run.status === "Failed"
      ? "Import Failed"
      : run.kind === "account"
        ? run.status === "Completed"
          ? "Daily Import Completed"
          : "Daily Import Completed with Errors"
        : run.status === "Completed"
          ? "Import Completed"
          : "Import Completed with Errors";
  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-start gap-4 py-2">
          <Icon className={cn("size-9 shrink-0", iconTone)} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[19px] font-semibold text-foreground">{heading}</h2>
            <p className="mt-1 text-[13px] break-all text-muted-foreground">
              {run.fileName} · {run.dateTime}
            </p>
            {run.status === "Failed" && (
              <p className="mt-2 text-[13px] text-foreground">
                No records were changed. Review the issue below, correct the file and upload it again.
              </p>
            )}
          </div>
          <StatusPill tone={importStatusTone(run.status)}>{run.status}</StatusPill>
        </div>
      </Panel>
      {run.status !== "Failed" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Total Records" value={formatNumber(run.counts.total)} tone="primary" />
          <KpiCard label="Created" value={formatNumber(run.counts.created)} />
          <KpiCard label="Updated" value={formatNumber(run.counts.updated)} />
          <KpiCard label="Unchanged" value={formatNumber(run.counts.unchanged)} />
          <KpiCard label="Failed" value={formatNumber(run.counts.failed)} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {run.errors.length > 0 && (
          <Btn onClick={() => setShowErrors((s) => !s)}>{showErrors ? "Hide Errors" : "View Errors"}</Btn>
        )}
        <Link to={`/payflow/imports/${run.id}`}>
          <Btn>View Import Details</Btn>
        </Link>
        {returnTo}
      </div>
      {showErrors && <ImportErrorTable errors={run.errors} />}
    </div>
  );
}

function ClientPreviewTable({ records }: { records: ImportRecord[] }) {
  const groups = records.reduce<Record<string, ImportRecord[]>>((acc, r) => {
    (acc[r.clientName] ??= []).push(r);
    return acc;
  }, {});
  return (
    <DataTable minWidth={760} head={["Client / Sub-Client", "Client ID", "Sub-Client ID", "Action", "Status"]}>
      {Object.entries(groups).map(([name, rows]) => (
        <Fragment key={name}>
          <tr className="bg-muted/40">
            <Td>
              <span className="font-semibold text-foreground">{name}</span>
              <span className="ml-2 text-[11.5px] text-muted-foreground">{rows.length} sub-clients</span>
            </Td>
            <Td className="tabular text-muted-foreground">{rows.find((r) => r.clientId)?.clientId || "—"}</Td>
            <Td>{null}</Td>
            <Td>{null}</Td>
            <Td>{null}</Td>
          </tr>
          {rows.map((r, i) => (
            <Tr key={r.id}>
              <Td>
                <span className="pl-3 text-muted-foreground">{i === rows.length - 1 ? "└" : "├"}─ </span>
                {r.subClientName}
              </Td>
              <Td className="tabular text-muted-foreground">{r.clientId || "Missing"}</Td>
              <Td className="tabular">{r.subClientId}</Td>
              <Td>
                <StatusPill tone={actionTone(r.action)}>{r.action}</StatusPill>
              </Td>
              <Td className="text-[12.5px] text-muted-foreground">
                {r.action === "Error" ? <span className="text-destructive">{r.note}</span> : "Valid"}
              </Td>
            </Tr>
          ))}
        </Fragment>
      ))}
    </DataTable>
  );
}

function AccountPreviewTable({ records }: { records: ImportRecord[] }) {
  return (
    <DataTable
      minWidth={880}
      head={["Account ID", "Client → Sub-Client", "Current Balance", "Incoming Balance", "Action", "Status"]}
    >
      {records.map((r) => (
        <Tr key={r.id}>
          <Td className="tabular font-medium">{r.note}</Td>
          <Td>
            <PrimaryCell title={r.subClientName} subtitle={r.clientName} />
          </Td>
          <Td className="tabular text-muted-foreground">
            {r.currentBalance == null ? "New account" : formatCurrency(r.currentBalance)}
          </Td>
          <Td className="tabular font-medium">
            {formatCurrency(r.incomingBalance ?? 0)}
            {r.currentBalance != null && r.incomingBalance !== r.currentBalance && (
              <span className="ml-1.5 text-[11px] text-muted-foreground">
                {(r.incomingBalance ?? 0) < r.currentBalance ? "(↓)" : "(↑)"}
              </span>
            )}
          </Td>
          <Td>
            <StatusPill tone={actionTone(r.action)}>{r.action}</StatusPill>
          </Td>
          <Td className="text-[12.5px]">
            {r.action === "Error" ? (
              <span className="text-destructive">Needs correction</span>
            ) : (
              <span className="text-muted-foreground">Valid</span>
            )}
          </Td>
        </Tr>
      ))}
    </DataTable>
  );
}

const formatInfo: Record<ImportKind, { required: string[]; note: string }> = {
  client: {
    required: [
      "client_number",
      "client_code",
      "is_master_client",
      "master_client__client_number (subs)",
      "company_name / short_name",
    ],
    note: "CRM clients export (CSV/XLSX). Masters (is_master_client=True) become Clients; children with master_client__client_number become Sub-Clients/Portfolios. Daily account files then use master client_code + sub client_code.",
  },
  account: {
    required: [
      "account_id (or account_number)",
      "customer name (or first_name / last_name)",
      "outstanding_balance",
      "email (or email_address)",
      "client_code + sub_client_code — or CRM client_number",
    ],
    note: "Daily CRM account file (CSV or XLSX), including Debtor Summary dumps. Native CRM columns (account_number, first_name, email_address, client_number, …) are mapped automatically. Clients must already exist in PayFlow (matched by client_code or CRM client_number). Defaults: country CA, currency CAD, product P4 when missing.",
  },
};

function nowStamp() {
  const d = new Date();
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function mapPreviewAction(action: string): ImportAction {
  if (action === "Create") return "Create";
  if (action === "Update") return "Update";
  if (action === "No Change") return "No Change";
  return "Error";
}

function mapPreviewRecords(rows: PayflowImportPreviewResponse["preview"]): ImportRecord[] {
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client,
    clientName: r.client_name,
    subClientId: r.sub_client,
    subClientName: r.sub_client_name,
    action: mapPreviewAction(r.action),
    currentBalance: r.current_balance,
    incomingBalance: r.incoming_balance ?? undefined,
    note: r.note ?? r.record_id,
  }));
}

function failedRunFromPreview(
  kind: ImportKind,
  preview: PayflowImportPreviewResponse,
  uploadedBy: string,
): ImportRun {
  return {
    id: `preview-${Date.now()}`,
    kind,
    fileName: preview.file_name,
    dateTime: nowStamp(),
    uploadedBy,
    status: "Failed",
    counts: { total: 0, created: 0, updated: 0, unchanged: 0, failed: 0 },
    errors: preview.errors.map((e) => ({
      recordId: e.record_id,
      client: e.client,
      subClient: e.sub_client,
      field: e.field,
      error: e.error,
      status: e.status === "Skipped" ? "Skipped" : "Rejected",
    })),
  };
}

function bulkUploadToRun(file: File, result: PayflowBulkUploadResult, uploadedBy: string): ImportRun {
  const summary = result.summary;
  const created = summary?.created ?? result.created_count;
  const updated = summary?.updated ?? 0;
  const failed = summary?.failed ?? result.error_count;
  const total = summary?.total ?? created + updated + failed;
  let status: ImportStatus = (result.status as ImportStatus) || "Completed";
  if (!result.status) {
    if (failed && (created || updated)) status = "Completed with Errors";
    else if (failed && !created && !updated) status = "Failed";
  }
  return {
    id: result.import_id != null ? String(result.import_id) : `bulk-${Date.now()}`,
    kind: "client",
    fileName: file.name,
    dateTime: nowStamp(),
    uploadedBy,
    status,
    counts: {
      total,
      created,
      updated,
      unchanged: summary?.unchanged ?? 0,
      failed,
    },
    errors: (result.errors || []).map((e) => ({
      recordId: String(e.row ?? "—"),
      client: e.code || "—",
      subClient: "—",
      field: "client_code",
      error: e.message,
      status: "Rejected" as const,
    })),
  };
}

export function ImportFlow({ kind }: { kind: ImportKind }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [run, setRun] = useState<ImportRun | null>(null);
  const [previewSummary, setPreviewSummary] = useState<PayflowImportPreviewResponse["summary"] | null>(
    null,
  );
  const [previewRecords, setPreviewRecords] = useState<ImportRecord[]>([]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const isClient = kind === "client";
  const backTo = isClient ? "/payflow/clients" : "/payflow/cases";
  const previewTotal = previewSummary?.total ?? 0;
  const canProcess =
    !!previewSummary &&
    previewSummary.created + previewSummary.updated + previewSummary.unchanged > 0;

  const onFile = (f: File | null) => {
    setFileError(null);
    setSubmitError(null);
    if (f && !/\.(csv|xlsx)$/i.test(f.name)) {
      setFile(null);
      setFileError("This file type isn't supported. Please upload a CSV or XLSX file.");
      return;
    }
    setFile(f);
  };

  async function validateFile() {
    if (!file) return;
    setSubmitError(null);
    setStage("validating");
    try {
      const preview = isClient
        ? await validatePayflowClientsBulk(file)
        : await validatePayflowAccountImport(file);
      if (!preview.ok) {
        const failed = failedRunFromPreview(kind, preview, user?.full_name || "You");
        addImport(failed);
        setRun(failed);
        setStage("done");
        return;
      }
      setPreviewSummary(preview.summary);
      setPreviewRecords(mapPreviewRecords(preview.preview));
      setStage("preview");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.detail : "Validation failed");
      setStage("upload");
    }
  }

  async function processFile() {
    if (!file) return;
    setSubmitError(null);
    setStage("processing");
    try {
      if (isClient) {
        const result = await uploadPayflowClientsBulk(file);
        const mapped = bulkUploadToRun(file, result, user?.full_name || "You");
        addImport(mapped);
        setRun(mapped);
      } else {
        const result = await uploadPayflowAccountImport(file);
        const mapped = mapApiImportRun(result);
        addImport(mapped);
        setRun(mapped);
      }
      setStage("done");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.detail : "Import failed");
      setStage("preview");
    }
  }

  const reset = () => {
    setStage("upload");
    setFile(null);
    setRun(null);
    setPreviewSummary(null);
    setPreviewRecords([]);
  };

  const returnBtn = (
    <Link to={backTo}>
      <Btn variant="primary">Return to {isClient ? "Clients" : "Accounts"}</Btn>
    </Link>
  );

  return (
    <>
      <StageBar stage={stage} />

      {stage === "upload" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {!isClient ? (
            <div className="space-y-5">
              <PreviousImportPanel />
              <Panel title="Current Upload">
                <FileDropzone
                  file={file}
                  onFile={onFile}
                  error={fileError}
                  accept={acceptedTypes}
                />
              </Panel>
            </div>
          ) : (
            <Panel title="Upload File" description="Select the CRM client file you received.">
              <FileDropzone file={file} onFile={onFile} error={fileError} accept={acceptedTypes} />
            </Panel>
          )}
          <Panel title="Required Data / File Format">
            <p className="text-[12.5px] text-muted-foreground">{formatInfo[kind].note}</p>
            <ul className="mt-3 space-y-1.5">
              {formatInfo[kind].required.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12.5px] text-foreground">
                  <CheckCircleIcon className="size-3.5 text-success" /> {f}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] text-muted-foreground">
              CSV or XLSX · first row contains column headers.
            </p>
            {!isClient ? (
              <div className="mt-4">
                <Btn
                  onClick={() => {
                    void downloadPayflowAccountImportTemplate().catch((err) =>
                      setSubmitError(err instanceof ApiError ? err.detail : "Template download failed"),
                    );
                  }}
                >
                  Download sample template
                </Btn>
              </div>
            ) : null}
          </Panel>
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            {submitError ? <p className="w-full text-[12.5px] font-medium text-destructive">{submitError}</p> : null}
            <Btn variant="primary" disabled={!file} onClick={() => void validateFile()}>
              Continue / Validate File
            </Btn>
            <Btn variant="ghost" onClick={() => navigate(backTo)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {stage === "validating" && <ProgressPanel title="Validating file" done={0} total={0} unit="" />}

      {stage === "preview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {isClient ? (
              <>
                <KpiCard label="Total Records" value={formatNumber(previewTotal)} tone="primary" />
                <KpiCard label="New Clients" value={formatNumber(previewSummary?.new_clients ?? 0)} />
                <KpiCard label="Errors" value={formatNumber(previewSummary?.failed ?? 0)} />
              </>
            ) : (
              <>
                <KpiCard label="Total Accounts" value={formatNumber(previewTotal)} tone="primary" />
                <KpiCard label="New Accounts" value={formatNumber(previewSummary?.created ?? 0)} />
                <KpiCard label="Accounts to Update" value={formatNumber(previewSummary?.updated ?? 0)} />
                <KpiCard label="Unchanged" value={formatNumber(previewSummary?.unchanged ?? 0)} />
                <KpiCard label="Errors" value={formatNumber(previewSummary?.failed ?? 0)} />
              </>
            )}
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Showing up to {formatNumber(previewRecords.length)} of {formatNumber(previewTotal)} records from{" "}
            <span className="font-medium text-foreground">{file?.name}</span>. Records with errors will be skipped;
            all others will be processed when you continue.
          </p>
          {submitError ? <p className="text-[12.5px] font-medium text-destructive">{submitError}</p> : null}
          {isClient ? (
            <ClientPreviewTable records={previewRecords} />
          ) : (
            <AccountPreviewTable records={previewRecords} />
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" disabled={!canProcess} onClick={() => void processFile()}>
              {isClient ? "Process Import" : "Process Daily File"}
            </Btn>
            <Btn onClick={reset}>Go Back</Btn>
            <Btn variant="ghost" onClick={() => navigate(backTo)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {stage === "processing" && (
        <ProgressPanel
          title={isClient ? "Processing Client Import" : "Processing Daily CRM Data"}
          done={0}
          total={0}
          unit={isClient ? "records" : "accounts"}
        />
      )}

      {stage === "done" && run && (
        <ImportResult
          run={run}
          returnTo={
            <>
              {run.status === "Failed" && <Btn onClick={reset}>Upload Again</Btn>}
              {returnBtn}
            </>
          }
        />
      )}
    </>
  );
}

function PreviousImportPanel() {
  const [last, setLast] = useState<ImportRun | null>(null);
  const [ok, setOk] = useState<ImportRun | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPayflowImports({ type: "account" })
      .then((res) => {
        if (cancelled) return;
        const mapped = (res.imports || []).map(mapApiImportRun);
        setLast(mapped[0] ?? null);
        setOk(mapped.find((r) => r.status !== "Failed" && r.status !== "Processing") ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setLast(lastImport("account") ?? null);
          setOk(lastSuccessfulImport("account") ?? null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <Panel
      title="Previous Import"
      action={
        <Link to="/payflow/imports?type=account" className="text-[12.5px] font-semibold text-primary hover:underline">
          Import History
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-eyebrow">Last Successful Upload</p>
          <p className="mt-1 text-[13px] font-semibold break-all text-foreground">{ok?.fileName ?? "—"}</p>
        </div>
        <div>
          <p className="text-eyebrow">Last Upload Date / Time</p>
          <p className="mt-1 text-[13px] font-semibold text-foreground">{last?.dateTime ?? "—"}</p>
        </div>
        <div>
          <p className="text-eyebrow">Last Status</p>
          <div className="mt-1">
            {last ? <StatusPill tone={importStatusTone(last.status)}>{last.status}</StatusPill> : "—"}
          </div>
        </div>
      </div>
    </Panel>
  );
}
