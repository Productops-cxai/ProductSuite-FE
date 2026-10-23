import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequestBlob } from "../../api/client";
import { listPayflowClients, previewPaymentReconciliation } from "../../api/payflow";
import {
  Btn,
  DataTable,
  EmptyState,
  Field,
  KpiCard,
  PageHeader,
  Panel,
  StatusPill,
  Td,
  Tr,
  type Tone,
} from "../../components/payflow/lovable/payflow-ui";
import type { PayflowClient } from "../../types";

type ReconRow = Record<string, string | number | null | undefined>;

type Preview = {
  generated_at?: string;
  export_reference?: string;
  totals?: {
    transaction_count?: number;
    payment_amount_total?: number;
    refund_amount_total?: number;
  };
  rows?: ReconRow[];
};

type ReconGroup = {
  key: string;
  client_code: string;
  account_reference: string;
  case_id: number | null;
  portfolio_code: string;
  latest: ReconRow;
  transactions: ReconRow[];
  payment_total: number;
  refund_total: number;
};

const inputClass =
  "h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground outline-none focus:border-primary";

function money(n?: number | null, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

function asText(value: unknown) {
  if (value == null || value === "") return "—";
  return String(value);
}

function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s.includes("succeed") || s === "paid" || s === "completed") return "success";
  if (s.includes("fail") || s.includes("cancel")) return "danger";
  if (s.includes("pending") || s.includes("process")) return "warning";
  if (s.includes("refund")) return "info";
  return "neutral";
}

function txnTime(row: ReconRow): number {
  const t = Date.parse(String(row.payment_datetime || ""));
  return Number.isFinite(t) ? t : 0;
}

function groupKeyForRow(row: ReconRow): string {
  const caseId = row.payflow_case_id;
  if (caseId != null && caseId !== "") return `case-${caseId}`;
  const ref = String(row.account_reference || "").trim();
  const client = String(row.payflow_client_id || row.payflow_client_code || "");
  if (ref) return `acct-${client}-${ref}`;
  return `txn-${row.payflow_transaction_id || "x"}`;
}

function buildReconGroups(rows: ReconRow[]): ReconGroup[] {
  const map = new Map<string, ReconRow[]>();
  for (const row of rows) {
    const key = groupKeyForRow(row);
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  }
  const groups: ReconGroup[] = [];
  for (const [key, txns] of map.entries()) {
    const sorted = [...txns].sort((a, b) => txnTime(b) - txnTime(a));
    const latest = sorted[0];
    let payment_total = 0;
    let refund_total = 0;
    for (const t of sorted) {
      const amt = Number(t.payment_amount || 0);
      const dir = String(t.transaction_type || "payment").toLowerCase();
      if (dir === "payment" && String(t.payment_status).toLowerCase().includes("succeed")) {
        payment_total += amt;
      } else if (["refund", "reversal", "adjustment"].includes(dir)) {
        refund_total += amt;
      }
    }
    const caseRaw = latest.payflow_case_id;
    groups.push({
      key,
      client_code: String(latest.payflow_client_code || latest.payflow_client_id || ""),
      account_reference: String(latest.account_reference || ""),
      case_id:
        caseRaw != null && caseRaw !== "" && Number.isFinite(Number(caseRaw))
          ? Number(caseRaw)
          : null,
      portfolio_code: String(latest.portfolio_code || latest.portfolio_id || ""),
      latest,
      transactions: sorted,
      payment_total: Math.round(payment_total * 100) / 100,
      refund_total: Math.round(refund_total * 100) / 100,
    });
  }
  return groups.sort((a, b) => txnTime(b.latest) - txnTime(a.latest));
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  const text = asText(value);
  if (text === "—") return null;
  return (
    <div className="border-b border-border/60 py-2.5 last:border-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-foreground">{text}</p>
    </div>
  );
}

function TransactionCard({
  row,
  defaultExpanded = false,
}: {
  row: ReconRow;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const status = asText(row.payment_status);
  const currency = String(row.currency || "USD");
  const title = asText(row.payflow_transaction_id);

  return (
    <div className="rounded-lg border border-border/70 bg-surface/40">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground transition-transform ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ›
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">{title}</span>
          <StatusPill tone={statusTone(status)}>{status}</StatusPill>
          <StatusPill>{asText(row.transaction_type)}</StatusPill>
          <span className="text-[13px] font-medium text-foreground">
            {money(Number(row.payment_amount), currency)}
          </span>
          {defaultExpanded ? (
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Latest
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-[12px] text-muted-foreground">
          {row.payment_datetime
            ? new Date(String(row.payment_datetime)).toLocaleString()
            : "—"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-border/60 px-4 pb-3 pt-1">
          <div className="grid gap-x-6 sm:grid-cols-2">
            <DetailField label="Transaction ID" value={row.payflow_transaction_id} />
            <DetailField label="Provider" value={row.payment_provider} />
            <DetailField label="Provider ref" value={row.provider_transaction_id} />
            <DetailField label="Payment method" value={row.payment_method} />
            <DetailField label="Status" value={row.payment_status} />
            <DetailField label="Type" value={row.transaction_type} />
            <DetailField
              label="Amount"
              value={`${money(Number(row.payment_amount), currency)} ${currency}`}
            />
            <DetailField
              label="When"
              value={
                row.payment_datetime
                  ? new Date(String(row.payment_datetime)).toLocaleString()
                  : null
              }
            />
            <DetailField
              label="Balance before"
              value={
                row.balance_before != null && row.balance_before !== ""
                  ? money(Number(row.balance_before), currency)
                  : null
              }
            />
            <DetailField
              label="Balance after"
              value={
                row.balance_after != null && row.balance_after !== ""
                  ? money(Number(row.balance_after), currency)
                  : null
              }
            />
            <DetailField
              label="Current outstanding"
              value={
                row.current_outstanding_balance != null &&
                row.current_outstanding_balance !== ""
                  ? money(Number(row.current_outstanding_balance), currency)
                  : null
              }
            />
            <DetailField
              label="Payment link / attempt"
              value={row.payment_link_or_attempt_ref}
            />
            <DetailField label="CRM account ID" value={row.crm_account_id} />
            <DetailField label="CRM client number" value={row.crm_client_number} />
            <DetailField label="Export reference" value={row.reconciliation_export_reference} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PayFlowPaymentReconciliationPage() {
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [clientKey, setClientKey] = useState("All clients");
  const [portfolioId, setPortfolioId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("All");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const clientOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clients) map.set(`${c.name} (${c.code})`, c.id);
    return map;
  }, [clients]);

  useEffect(() => {
    listPayflowClients()
      .then((res) => setClients(res.clients || []))
      .catch(() => setClients([]));
  }, []);

  function filters() {
    return {
      client_id:
        clientKey !== "All clients" ? clientOptions.get(clientKey) : undefined,
      portfolio_id: portfolioId.trim() ? Number(portfolioId) : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      status: status !== "All" ? status : undefined,
    };
  }

  function selectRow(key: string) {
    setSelectedKey(key);
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function runPreview() {
    setLoading(true);
    setError("");
    try {
      const res = await previewPaymentReconciliation(filters());
      setPreview(res);
      const groups = buildReconGroups(res.rows || []);
      setSelectedKey(groups[0]?.key ?? null);
    } catch (err) {
      setPreview(null);
      setSelectedKey(null);
      setError(err instanceof ApiError ? err.detail : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    setExporting(true);
    setError("");
    try {
      const f = filters();
      const q = new URLSearchParams();
      if (f.client_id) q.set("client_id", String(f.client_id));
      if (f.portfolio_id) q.set("portfolio_id", String(f.portfolio_id));
      if (f.date_from) q.set("date_from", new Date(f.date_from).toISOString());
      if (f.date_to) q.set("date_to", new Date(`${f.date_to}T23:59:59`).toISOString());
      if (f.status) q.set("status", f.status);
      const qs = q.toString();
      const blob = await apiRequestBlob(
        `/payflow/reports/payment-reconciliation/export${qs ? `?${qs}` : ""}`,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payflow_payment_reconciliation_${preview?.export_reference || "export"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const rows = preview?.rows || [];
  const groups = useMemo(() => buildReconGroups(rows), [preview?.rows]);
  const totals = preview?.totals;
  const selected =
    selectedKey == null ? null : groups.find((g) => g.key === selectedKey) || null;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Reports" }, { label: "Payment Reconciliation" }]}
        title="CRM Payment Reconciliation"
        description="Confirmed payment ledger for CRM team matching. No CRM writeback in this phase."
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" disabled={loading} onClick={() => void runPreview()}>
              {loading ? "Loading…" : "Generate preview"}
            </Btn>
            <Btn
              variant="primary"
              disabled={exporting || !preview}
              onClick={() => void downloadCsv()}
            >
              {exporting ? "Downloading…" : "Download CSV"}
            </Btn>
          </div>
        }
      />

      {error ? (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      <Panel title="Filters" className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Client">
            <select
              className={inputClass}
              value={clientKey}
              onChange={(e) => setClientKey(e.target.value)}
            >
              <option>All clients</option>
              {[...clientOptions.keys()].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Portfolio ID">
            <input
              className={inputClass}
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="From date">
            <input
              type="date"
              className={inputClass}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Field>
          <Field label="To date">
            <input
              type="date"
              className={inputClass}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["All", "Succeeded", "Failed", "Pending", "Refunded"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>

      {!preview && !loading ? (
        <EmptyState
          title="Generate a preview"
          description="Choose filters and run Generate preview, then download CSV for the CRM team."
        />
      ) : null}

      {preview ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Transactions" value={String(totals?.transaction_count ?? 0)} />
            <KpiCard label="Payments total" value={money(totals?.payment_amount_total)} />
            <KpiCard label="Refunds / adjustments" value={money(totals?.refund_amount_total)} />
            <KpiCard
              label="Export reference"
              value={preview.export_reference || "—"}
              hint={
                preview.generated_at
                  ? `Generated ${new Date(preview.generated_at).toLocaleString()}`
                  : undefined
              }
            />
          </div>

          <div className="space-y-5">
            <Panel
              title="Reconciliation list"
              description={`${groups.length} account(s) · ${rows.length} transaction(s) · click to open details below`}
            >
              {groups.length === 0 ? (
                <EmptyState
                  title="No transactions"
                  description="Adjust filters or confirm payments exist for this scope."
                />
              ) : (
                <DataTable
                  minWidth={720}
                  head={[
                    "Client",
                    "Account",
                    "Latest status",
                    "Payments",
                    "Transactions",
                  ]}
                >
                  {groups.map((g) => {
                    const active = g.key === selectedKey;
                    const latestStatus = asText(g.latest.payment_status);
                    return (
                      <Tr
                        key={g.key}
                        className={active ? "bg-primary/5" : undefined}
                        onClick={() => selectRow(g.key)}
                      >
                        <Td>{asText(g.client_code)}</Td>
                        <Td className="max-w-[220px] truncate font-medium">
                          {asText(g.account_reference || (g.case_id ? `#${g.case_id}` : null))}
                        </Td>
                        <Td>
                          <StatusPill tone={statusTone(latestStatus)}>
                            {latestStatus}
                          </StatusPill>
                        </Td>
                        <Td>{money(g.payment_total)}</Td>
                        <Td className="text-[12px] text-muted-foreground">
                          {g.transactions.length} txn
                          {g.transactions.length === 1 ? "" : "s"}
                        </Td>
                      </Tr>
                    );
                  })}
                </DataTable>
              )}
            </Panel>

            <div ref={detailRef}>
              <Panel
                title="Reconciliation detail"
                description={
                  selected
                    ? `${asText(selected.account_reference || selected.case_id)} · ${selected.transactions.length} transaction(s)`
                    : "All transactions for the selected account"
                }
              >
                {!selected ? (
                  <EmptyState
                    title="No account selected"
                    description="Choose a row above to inspect every transaction in the detail card."
                  />
                ) : (
                  <div>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <StatusPill tone="info">Account</StatusPill>
                      <span className="text-[13px] font-medium text-foreground">
                        {asText(
                          selected.account_reference ||
                            (selected.case_id ? `Case #${selected.case_id}` : null),
                        )}
                      </span>
                      {selected.client_code ? (
                        <span className="text-[12px] text-muted-foreground">
                          {selected.client_code}
                        </span>
                      ) : null}
                      {selected.portfolio_code ? (
                        <StatusPill>{selected.portfolio_code}</StatusPill>
                      ) : null}
                      <span className="text-[12px] text-muted-foreground">
                        Paid {money(selected.payment_total)}
                        {selected.refund_total
                          ? ` · Refunds ${money(selected.refund_total)}`
                          : ""}
                      </span>
                      {selected.case_id ? (
                        <Link
                          to={`/payflow/cases/${selected.case_id}`}
                          className="text-[12.5px] font-medium text-primary hover:underline"
                        >
                          Open case
                        </Link>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      {selected.transactions.map((t, i) => (
                        <TransactionCard
                          key={`${selected.key}-${t.payflow_transaction_id ?? i}`}
                          row={t}
                          defaultExpanded={i === 0}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
