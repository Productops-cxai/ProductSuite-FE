/**
 * CRM file ingestion — illustrative frontend data only.
 * No real file parsing or backend processing happens; uploads produce
 * realistic mock validation, processing and reconciliation results.
 */
export type ImportKind = "client" | "account";
export type ImportAction = "Create" | "Update" | "No Change" | "Error";
export type ImportStatus =
  | "Uploaded"
  | "Validating"
  | "Processing"
  | "Completed"
  | "Completed with Errors"
  | "Failed";

export interface ImportError {
  recordId: string;
  client: string;
  subClient: string;
  field: string;
  error: string;
  status: "Rejected" | "Skipped";
}

export interface ImportRecord {
  id: string;
  clientId: string;
  clientName: string;
  subClientId: string;
  subClientName: string;
  action: ImportAction;
  /** Client hierarchy: false = master Client row, true = Sub-Client/Portfolio. */
  isSub?: boolean;
  /** Account imports only. */
  currentBalance?: number | null;
  incomingBalance?: number;
  note?: string;
}

export interface ImportCounts {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  rejected?: number;
  successful?: number;
}

/** Successful = created + updated + unchanged. Rejected defaults from error rows when missing. */
export function normalizeImportCounts(
  counts: ImportCounts,
  errors: ImportError[] = [],
): Required<ImportCounts> {
  const successful =
    counts.successful ?? counts.created + counts.updated + counts.unchanged;
  const rejected =
    counts.rejected ??
    errors.filter((e) => e.status === "Rejected").length;
  return {
    total: counts.total,
    created: counts.created,
    updated: counts.updated,
    unchanged: counts.unchanged,
    failed: counts.failed,
    rejected,
    successful,
  };
}

export interface ImportRun {
  id: string;
  kind: ImportKind;
  fileName: string;
  dateTime: string;
  uploadedBy: string;
  status: ImportStatus;
  counts: ImportCounts;
  errors: ImportError[];
}

export const importKindLabel: Record<ImportKind, string> = {
  client: "Client & Sub-Client Import",
  account: "Daily CRM Account File",
};

export const acceptedTypes = ".csv,.xlsx";

export const clientImportRecords: ImportRecord[] = [
  { id: "r1", clientId: "CL-1001", clientName: "PayPal", subClientId: "SC-2001", subClientName: "PayPal Loans", action: "No Change" },
  { id: "r2", clientId: "CL-1001", clientName: "PayPal", subClientId: "SC-2002", subClientName: "PayPal Finance", action: "Update" },
  { id: "r3", clientId: "CL-1001", clientName: "PayPal", subClientId: "SC-2003", subClientName: "PayPal Third Party", action: "Update" },
  { id: "r4", clientId: "CL-1001", clientName: "PayPal", subClientId: "SC-2010", subClientName: "PayPal Business Credit", action: "Create" },
  { id: "r5", clientId: "CL-1002", clientName: "Canadian Tire", subClientId: "SC-2101", subClientName: "Canadian Tire Triangle Cards", action: "Update" },
  { id: "r6", clientId: "CL-1002", clientName: "Canadian Tire", subClientId: "SC-21X", subClientName: "Canadian Tire Auto Service", action: "Error", note: "Invalid identifier" },
  { id: "r7", clientId: "CL-1090", clientName: "Maple Telecom", subClientId: "SC-3001", subClientName: "Maple Mobile", action: "Create" },
  { id: "r8", clientId: "CL-1090", clientName: "Maple Telecom", subClientId: "SC-3002", subClientName: "Maple Home Internet", action: "Create" },
  { id: "r9", clientId: "CL-1091", clientName: "Lakeshore Credit Union", subClientId: "SC-3101", subClientName: "Lakeshore Personal Loans", action: "Create" },
  { id: "r10", clientId: "", clientName: "Lakeshore Credit Union", subClientId: "SC-3102", subClientName: "Lakeshore Lines of Credit", action: "Error", note: "Missing Client ID" },
];

export const clientImportSummary = {
  total: 1000,
  newClients: 12,
  existingClients: 38,
  newSubClients: 108,
  existingSubClients: 832,
  errors: 10,
};

export const accountImportRecords: ImportRecord[] = [
  { id: "a1", clientId: "paypal", clientName: "PayPal", subClientId: "", subClientName: "PayPal Loans", action: "Update", currentBalance: 1840, incomingBalance: 1615, note: "PP-10482" },
  { id: "a2", clientId: "paypal", clientName: "PayPal", subClientId: "", subClientName: "PayPal Loans", action: "No Change", currentBalance: 920, incomingBalance: 920, note: "PP-10511" },
  { id: "a3", clientId: "paypal", clientName: "PayPal", subClientId: "", subClientName: "PayPal Finance", action: "Create", currentBalance: null, incomingBalance: 2350, note: "PP-11903" },
  { id: "a4", clientId: "paypal", clientName: "PayPal", subClientId: "", subClientName: "PayPal Finance", action: "Update", currentBalance: 3120, incomingBalance: 2870, note: "PP-10655" },
  { id: "a5", clientId: "paypal", clientName: "PayPal", subClientId: "", subClientName: "PayPal Third Party", action: "Error", currentBalance: 640, incomingBalance: -40, note: "PP-10702" },
  { id: "a6", clientId: "canadian-tire", clientName: "Canadian Tire", subClientId: "", subClientName: "Canadian Tire Triangle Cards", action: "Update", currentBalance: 1275, incomingBalance: 1180, note: "CT-55120" },
  { id: "a7", clientId: "canadian-tire", clientName: "Canadian Tire", subClientId: "", subClientName: "Canadian Tire Triangle Cards", action: "Create", currentBalance: null, incomingBalance: 860, note: "CT-58841" },
  { id: "a8", clientId: "canadian-tire", clientName: "Canadian Tire", subClientId: "", subClientName: "Canadian Tire Garden Club", action: "Error", currentBalance: null, incomingBalance: 410, note: "CT-58902" },
  { id: "a9", clientId: "northstar-utilities", clientName: "Northstar Utilities", subClientId: "", subClientName: "Northstar Residential", action: "No Change", currentBalance: 515, incomingBalance: 515, note: "NS-30218" },
  { id: "a10", clientId: "northstar-utilities", clientName: "Northstar Utilities", subClientId: "", subClientName: "Northstar Residential", action: "Update", currentBalance: 788, incomingBalance: 0, note: "NS-30244" },
];

export const accountImportSummary = {
  total: 12000,
  newAccounts: 640,
  toUpdate: 10920,
  unchanged: 382,
  errors: 58,
};

export const sampleClientErrors: ImportError[] = [
  { recordId: "Row 214", client: "Canadian Tire", subClient: "Canadian Tire Auto Service", field: "Sub-Client ID", error: "Invalid identifier — Sub-Client IDs must follow the agreed format (e.g. SC-2101).", status: "Rejected" },
  { recordId: "Row 388", client: "Lakeshore Credit Union", subClient: "Lakeshore Lines of Credit", field: "Client ID", error: "Missing required field — every record needs a Client ID.", status: "Rejected" },
  { recordId: "Row 402", client: "Maple Telecom", subClient: "Maple Mobile", field: "Sub-Client ID", error: "Duplicate record — this Sub-Client appears more than once in the file.", status: "Skipped" },
  { recordId: "Row 517", client: "Harbour Insurance", subClient: "Harbour Auto", field: "Client ID", error: "Invalid relationship — this Sub-Client is already linked to a different Client.", status: "Rejected" },
  { recordId: "Row 640", client: "PayPal", subClient: "PayPal Loans", field: "Client Name", error: "Invalid value — Client Name cannot be blank.", status: "Rejected" },
];

export const sampleAccountErrors: ImportError[] = [
  { recordId: "PP-10702", client: "PayPal", subClient: "PayPal Third Party", field: "Outstanding Balance", error: "Invalid value — balance cannot be negative.", status: "Rejected" },
  { recordId: "CT-58902", client: "Canadian Tire", subClient: "Canadian Tire Garden Club", field: "Sub-Client", error: "Unknown Sub-Client — this portfolio does not exist for Canadian Tire.", status: "Rejected" },
  { recordId: "ZX-00419", client: "Zenith Retail", subClient: "—", field: "Client", error: "Unknown Client — this client has not been set up in PayFlow.", status: "Rejected" },
  { recordId: "NS-30290", client: "Northstar Utilities", subClient: "Northstar Commercial", field: "Mobile Number", error: "Missing required field — a contact number is needed for this account.", status: "Rejected" },
  { recordId: "PP-10482", client: "PayPal", subClient: "PayPal Loans", field: "Account ID", error: "Duplicate record — this account appears twice in the file.", status: "Skipped" },
];

const STORAGE_KEY = "payflow-import-runs";

const seedRuns: ImportRun[] = [
  { id: "imp-1042", kind: "account", fileName: "CRM_ACCOUNTS_20261004.csv", dateTime: "04 Oct 2026, 09:12", uploadedBy: "Daniya", status: "Completed with Errors", counts: { total: 11870, created: 512, updated: 10940, unchanged: 377, failed: 41 }, errors: sampleAccountErrors },
  { id: "imp-1041", kind: "account", fileName: "CRM_ACCOUNTS_20261003.csv", dateTime: "03 Oct 2026, 09:05", uploadedBy: "Daniya", status: "Completed", counts: { total: 11790, created: 430, updated: 10980, unchanged: 380, failed: 0 }, errors: [] },
  { id: "imp-1040", kind: "account", fileName: "CRM_ACCOUNTS_20261002.xlsx", dateTime: "02 Oct 2026, 09:20", uploadedBy: "Ahmed", status: "Failed", counts: { total: 0, created: 0, updated: 0, unchanged: 0, failed: 0 }, errors: [{ recordId: "File", client: "—", subClient: "—", field: "File structure", error: "The file does not match the agreed CRM layout, so no records were processed.", status: "Rejected" }] },
  { id: "imp-1038", kind: "client", fileName: "CRM_CLIENTS_Q3.csv", dateTime: "28 Sep 2026, 14:40", uploadedBy: "Daniya", status: "Completed", counts: { total: 940, created: 96, updated: 820, unchanged: 24, failed: 0 }, errors: [] },
];

function loadRuns(): ImportRun[] {
  if (typeof window === "undefined") return [...seedRuns];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...seedRuns];
    const parsed = JSON.parse(raw) as ImportRun[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...seedRuns];
    return parsed;
  } catch {
    return [...seedRuns];
  }
}

function persistRuns(next: ImportRun[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

let runs: ImportRun[] = loadRuns();

export function listImports(kind?: ImportKind) {
  return kind ? runs.filter((r) => r.kind === kind) : runs;
}
export function getImport(id: string) {
  return runs.find((r) => r.id === id);
}
export function addImport(run: ImportRun) {
  runs = [run, ...runs];
  persistRuns(runs);
}
export function lastImport(kind: ImportKind) {
  return runs.find((r) => r.kind === kind);
}
export function lastSuccessfulImport(kind: ImportKind) {
  return runs.find((r) => r.kind === kind && r.status !== "Failed" && r.status !== "Processing");
}

export function importStatusTone(status: ImportStatus | string) {
  if (status === "Completed") return "success" as const;
  if (status === "Completed with Errors") return "warning" as const;
  if (status === "Processing" || status === "Validating" || status === "Uploaded") return "info" as const;
  return "danger" as const;
}

export function actionTone(action: ImportAction) {
  if (action === "Create") return "info" as const;
  if (action === "Update") return "ai" as const;
  if (action === "Error") return "danger" as const;
  return "neutral" as const;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function mapApiImportRun(row: {
  id: number | string;
  kind: string;
  file_name: string;
  date_time: string;
  uploaded_by: string;
  status: string;
  counts: ImportCounts;
  errors?: Array<{
    record_id: string;
    client: string;
    sub_client: string;
    field: string;
    error: string;
    status: string;
  }>;
}): ImportRun {
  const errors: ImportError[] = (row.errors || []).map((e) => ({
    recordId: e.record_id,
    client: e.client,
    subClient: e.sub_client,
    field: e.field,
    error: e.error,
    status: e.status === "Skipped" ? "Skipped" : "Rejected",
  }));
  return {
    id: String(row.id),
    kind: row.kind === "client" ? "client" : "account",
    fileName: row.file_name,
    dateTime: row.date_time,
    uploadedBy: row.uploaded_by,
    status: row.status as ImportStatus,
    counts: normalizeImportCounts(row.counts || { total: 0, created: 0, updated: 0, unchanged: 0, failed: 0 }, errors),
    errors,
  };
}

/** Illustrative "last refreshed from CRM" stamp for an account. */
export function lastCrmRefresh(accountId: string) {
  let h = 0;
  for (let i = 0; i < accountId.length; i++) h = (h * 31 + accountId.charCodeAt(i)) >>> 0;
  const minutes = 5 + (h % 50);
  return `05 Oct 2026, 09:${String(minutes).padStart(2, "0")}`;
}
