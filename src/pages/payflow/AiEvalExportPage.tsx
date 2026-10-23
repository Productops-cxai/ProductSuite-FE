import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequestBlob } from "../../api/client";
import { listPayflowClients, previewAiEvalExport } from "../../api/payflow";
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

type EvalRow = Record<string, unknown>;

type Performance = {
  workflow_versions?: number;
  ai_origin_versions?: number;
  human_created_versions?: number;
  human_reviews?: number;
  hr_approved?: number;
  hr_rejected?: number;
  hr_modified?: number;
  hr_held?: number;
  hr_decided?: number;
  approval_rate_pct?: number | null;
  rejection_rate_pct?: number | null;
  modify_rate_pct?: number | null;
  avg_confidence?: number | null;
};

const inputClass =
  "h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground outline-none focus:border-primary";

function asText(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Prefer strategy step title/kind/purpose — not raw id like s1. */
function stepSnapshotLabel(step: unknown, index: number): { title: string; meta?: string } {
  const s = step && typeof step === "object" ? (step as Record<string, unknown>) : {};
  // BE may already attach normalized label/meta on export rows.
  if (typeof s.label === "string" && s.label.trim() && !/^step\s+\d+$/i.test(s.label.trim())) {
    return {
      title: String(s.title || s.label).trim(),
      meta: typeof s.meta === "string" && s.meta.trim() ? s.meta.trim() : undefined,
    };
  }
  const cfg =
    s.config && typeof s.config === "object" ? (s.config as Record<string, unknown>) : {};
  const kind = String(s.kind || s.type || "").trim();
  const title = String(
    s.title || s.name || s.label || s.purpose || cfg.purpose || cfg.action || kind || "",
  ).trim();
  const channel = String(s.channel || cfg.channel || "").trim();
  const purpose = String(s.purpose || cfg.purpose || "").trim();
  const action = String(cfg.action || s.action || "").trim();
  const timing = String(s.timing || "").trim();

  const metaParts = [
    kind && kind !== title ? kind : "",
    channel,
    purpose && purpose !== title ? purpose : "",
    action && action !== title && action !== purpose ? action : "",
    timing,
  ].filter(Boolean);

  if (title && !/^s\d+$/i.test(title)) {
    return { title, meta: metaParts.length ? metaParts.join(" · ") : undefined };
  }
  if (metaParts.length) {
    return { title: metaParts[0], meta: metaParts.slice(1).join(" · ") || undefined };
  }
  return { title: `Step ${index + 1}` };
}

type EvalGroup = {
  key: string;
  row_type: "workflow_version" | "human_review";
  client_code?: string;
  client_name?: string;
  item_name: string;
  strategy_id?: number | null;
  account_id?: number | null;
  latest: EvalRow;
  versions: EvalRow[];
};

function groupKeyForRow(row: EvalRow): string {
  if (row.row_type === "human_review") {
    if (row.strategy_id != null) return `hr-strategy-${row.strategy_id}`;
    if (row.account_id != null) return `hr-account-${row.account_id}`;
    return `hr-${row.review_id ?? "x"}`;
  }
  if (row.strategy_id != null) return `wf-${row.strategy_id}`;
  return `wf-${row.strategy_code || row.strategy_name || "x"}`;
}

function versionSortValue(row: EvalRow): number {
  const v = Number(row.version);
  if (Number.isFinite(v)) return v;
  const stamp = String(row.decided_at || row.event_date || "");
  const t = Date.parse(stamp);
  return Number.isFinite(t) ? t : Number(row.review_id) || 0;
}

/** Drop duplicate workflow version numbers / duplicate review ids (keep first = newest). */
function dedupeVersions(versions: EvalRow[]): EvalRow[] {
  const seen = new Set<string>();
  const out: EvalRow[] = [];
  for (const row of versions) {
    const key =
      row.row_type === "human_review"
        ? `hr-${row.review_id ?? ""}`
        : `wf-${row.strategy_id ?? ""}-v${row.version ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function buildEvalGroups(rows: EvalRow[]): EvalGroup[] {
  const map = new Map<string, EvalRow[]>();
  for (const row of rows) {
    const key = groupKeyForRow(row);
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  }
  const groups: EvalGroup[] = [];
  for (const [key, versions] of map.entries()) {
    const sorted = dedupeVersions(
      [...versions].sort((a, b) => versionSortValue(b) - versionSortValue(a)),
    );
    const latest = sorted[0];
    const rowType =
      latest.row_type === "human_review" ? "human_review" : "workflow_version";
    const itemName =
      rowType === "human_review"
        ? String(
            latest.strategy_name ||
              latest.strategy_code ||
              (latest.account_id != null ? `Case #${latest.account_id}` : "") ||
              latest.review_code ||
              "Human review",
          )
        : String(latest.strategy_name || latest.strategy_code || "Workflow");
    groups.push({
      key,
      row_type: rowType,
      client_code: latest.client_code != null ? String(latest.client_code) : undefined,
      client_name: latest.client_name != null ? String(latest.client_name) : undefined,
      item_name: itemName,
      strategy_id:
        latest.strategy_id != null ? Number(latest.strategy_id) : null,
      account_id: latest.account_id != null ? Number(latest.account_id) : null,
      latest,
      versions: sorted,
    });
  }
  return groups.sort((a, b) => versionSortValue(b.latest) - versionSortValue(a.latest));
}

function decisionTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s.includes("approv") || s === "active") return "success";
  if (s.includes("reject")) return "danger";
  if (s.includes("modif") || s.includes("hold") || s.includes("await") || s.includes("review"))
    return "warning";
  return "neutral";
}

function StepsSnapshot({ steps }: { steps: unknown }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const list = steps.slice(0, 20);
  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Steps snapshot · {list.length} step{list.length === 1 ? "" : "s"} in order
      </p>
      <ol className="relative m-0 list-none space-y-0 p-0">
        {list.map((step, i) => {
          const { title, meta } = stepSnapshotLabel(step, i);
          const isLast = i === list.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute left-[13px] top-7 bottom-0 w-px bg-border"
                  aria-hidden
                />
              ) : null}
              <span
                className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 rounded-md border border-border/70 bg-card px-3 py-2">
                <p className="text-[12px] font-medium text-foreground">
                  <span className="sr-only">Step {i + 1}: </span>
                  {title}
                </p>
                {meta ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {meta}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function VersionCard({
  row,
  defaultExpanded = false,
}: {
  row: EvalRow;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const isHr = row.row_type === "human_review";
  const status = asText(row.decision_outcome || row.review_status || row.status);
  const title = isHr
    ? asText(row.review_code || `Review #${row.review_id}`)
    : `Version ${asText(row.version)}`;

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
          <StatusPill tone={isHr ? "warning" : "info"}>{title}</StatusPill>
          <StatusPill tone={decisionTone(status)}>{status}</StatusPill>
          {row.origin ? <StatusPill>{asText(row.origin)}</StatusPill> : null}
          {defaultExpanded ? (
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Latest
            </span>
          ) : null}
        </div>
        {isHr && row.review_id ? (
          <Link
            to={`/payflow/review/${row.review_id}`}
            className="shrink-0 text-[12.5px] font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Open review
          </Link>
        ) : null}
        {!isHr && row.strategy_id ? (
          <Link
            to={`/payflow/workflows/${row.strategy_id}`}
            className="shrink-0 text-[12.5px] font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Open workflow
          </Link>
        ) : null}
      </button>
      {open ? (
        <div className="border-t border-border/60 px-4 pb-3 pt-1">
          {isHr ? (
            <div className="grid gap-x-6 sm:grid-cols-2">
              <DetailField label="Proposed action" value={row.proposed_action} />
              <DetailField label="Final action" value={row.final_action} />
              <DetailField label="Decision outcome" value={row.decision_outcome} />
              <DetailField label="Confidence" value={row.confidence} />
              <DetailField label="Reason" value={row.note} />
              <DetailField label="Condition" value={row.condition_text} />
              <DetailField label="Observed value" value={row.observed_value} />
              <DetailField label="Guidance" value={row.guidance} />
              <DetailField label="Rejection reason" value={row.rejection_reason} />
              <DetailField label="Explanation" value={row.explanation} />
              <DetailField label="Decided at" value={row.decided_at} />
              <DetailField label="Event date" value={row.event_date} />
            </div>
          ) : (
            <div className="grid gap-x-6 sm:grid-cols-2">
              <DetailField label="Status" value={row.status} />
              <DetailField label="Origin" value={row.origin} />
              <DetailField label="Event date" value={row.event_date} />
              <DetailField label="Approved by" value={row.approved_by} />
              <DetailField label="Approval date" value={row.approval_date} />
              <DetailField label="Steps count" value={row.steps_count} />
              <DetailField label="Note" value={row.note} />
              <DetailField label="Reviewer note" value={row.reviewer_note} />
              <DetailField label="Segment" value={row.segment_summary} />
              <DetailField label="Changes" value={row.changes_summary} />
            </div>
          )}
          {isHr ? (
            <AuditList items={row.audit_trail} />
          ) : (
            <StepsSnapshot steps={row.steps_detail} />
          )}
        </div>
      ) : null}
    </div>
  );
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

function AuditList({ items }: { items: unknown }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Audit trail
      </p>
      <ul className="space-y-2">
        {items.map((ev, i) => {
          const row = (ev && typeof ev === "object" ? ev : {}) as Record<string, unknown>;
          return (
            <li
              key={i}
              className="rounded-md border border-border/70 bg-surface px-3 py-2 text-[12px]"
            >
              <p className="font-medium text-foreground">{asText(row.event)}</p>
              {row.detail ? (
                <p className="mt-0.5 text-muted-foreground">{asText(row.detail)}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {row.actor ? `${asText(row.actor)} · ` : ""}
                {asText(row.at)}
                {row.before_status || row.after_status
                  ? ` · ${asText(row.before_status)} → ${asText(row.after_status)}`
                  : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PayFlowAiEvalExportPage() {
  const [clients, setClients] = useState<PayflowClient[]>([]);
  const [clientKey, setClientKey] = useState("All clients");
  const [preview, setPreview] = useState<{
    export_reference?: string;
    generated_at?: string;
    totals?: {
      row_count?: number;
      workflow_versions?: number;
      human_reviews?: number;
    };
    performance?: Performance;
    rows?: EvalRow[];
  } | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  function selectRow(key: string) {
    setSelectedKey(key);
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

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

  function clientId() {
    return clientKey !== "All clients" ? clientOptions.get(clientKey) : undefined;
  }

  async function runPreview() {
    setLoading(true);
    setError("");
    try {
      const res = await previewAiEvalExport({ client_id: clientId(), limit: 500 });
      setPreview(res as typeof preview);
      const groups = buildEvalGroups((res.rows || []) as EvalRow[]);
      setSelectedKey(groups[0]?.key ?? null);
    } catch (err) {
      setPreview(null);
      setSelectedKey(null);
      setError(err instanceof ApiError ? err.detail : "Failed to load AI eval preview");
    } finally {
      setLoading(false);
    }
  }

  async function download(format: "csv" | "json") {
    setExporting(format);
    setError("");
    try {
      const q = new URLSearchParams();
      const cid = clientId();
      if (cid) q.set("client_id", String(cid));
      q.set("format", format);
      const blob = await apiRequestBlob(`/payflow/reports/ai-eval/export?${q.toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-eval.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  const rows = (preview?.rows || []) as EvalRow[];
  const groups = useMemo(
    () => buildEvalGroups((preview?.rows || []) as EvalRow[]),
    [preview?.rows],
  );
  const performance = preview?.performance;
  const selected =
    selectedKey == null ? null : groups.find((g) => g.key === selectedKey) || null;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Reports" }, { label: "AI Eval Export" }]}
        title="AI evaluation"
        description="Workflow AI proposals and human-review outcomes — use this to judge AI performance."
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" disabled={loading} onClick={() => void runPreview()}>
              {loading ? "Loading…" : "Generate preview"}
            </Btn>
            <Btn
              variant="secondary"
              disabled={exporting !== null}
              onClick={() => void download("csv")}
            >
              {exporting === "csv" ? "Exporting…" : "Download CSV"}
            </Btn>
            <Btn
              variant="primary"
              disabled={exporting !== null}
              onClick={() => void download("json")}
            >
              {exporting === "json" ? "Exporting…" : "Download JSON"}
            </Btn>
          </div>
        }
      />

      <Panel title="Filters" className="mb-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
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
        </div>
      </Panel>

      {error ? (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      {!preview && !loading ? (
        <EmptyState
          title="Generate a preview"
          description="Choose a client scope and run Generate preview to inspect AI vs human decisions."
        />
      ) : null}

      {preview ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="AI-origin workflow versions"
              value={String(performance?.ai_origin_versions ?? 0)}
              hint={`${performance?.human_created_versions ?? 0} human-created`}
            />
            <KpiCard
              label="HR approval rate"
              value={
                performance?.approval_rate_pct != null
                  ? `${performance.approval_rate_pct}%`
                  : "—"
              }
              hint={`${performance?.hr_approved ?? 0} approved / ${performance?.hr_decided ?? 0} decided`}
            />
            <KpiCard
              label="HR rejection rate"
              value={
                performance?.rejection_rate_pct != null
                  ? `${performance.rejection_rate_pct}%`
                  : "—"
              }
              hint={`${performance?.hr_rejected ?? 0} rejected · ${performance?.hr_modified ?? 0} modified`}
            />
            <KpiCard
              label="Avg AI confidence"
              value={
                performance?.avg_confidence != null
                  ? String(performance.avg_confidence)
                  : "—"
              }
              hint={
                preview.export_reference
                  ? `Ref ${preview.export_reference}`
                  : undefined
              }
            />
          </div>

          <div className="space-y-5">
            <Panel
              title="Evaluation list"
              description={`${groups.length} evaluation(s) · ${rows.length} version(s) · click to open all versions below`}
            >
              {groups.length === 0 ? (
                <EmptyState
                  title="No evaluation rows"
                  description="No workflow versions or human reviews in this scope yet."
                />
              ) : (
                <DataTable
                  minWidth={720}
                  head={["Type", "Client", "Item", "Latest status", "Versions"]}
                >
                  {groups.map((g) => {
                    const active = g.key === selectedKey;
                    const latest = g.latest;
                    const decision = asText(
                      latest.decision_outcome || latest.review_status || latest.status,
                    );
                    return (
                      <Tr
                        key={g.key}
                        className={active ? "bg-primary/5" : undefined}
                        onClick={() => selectRow(g.key)}
                      >
                        <Td>
                          <StatusPill
                            tone={g.row_type === "human_review" ? "warning" : "info"}
                          >
                            {g.row_type === "human_review" ? "Human review" : "Workflow"}
                          </StatusPill>
                        </Td>
                        <Td>{asText(g.client_code || g.client_name)}</Td>
                        <Td className="max-w-[240px] truncate">{g.item_name}</Td>
                        <Td>
                          <StatusPill tone={decisionTone(decision)}>{decision}</StatusPill>
                        </Td>
                        <Td className="text-[12px] text-muted-foreground">
                          {g.versions.length} version{g.versions.length === 1 ? "" : "s"}
                        </Td>
                      </Tr>
                    );
                  })}
                </DataTable>
              )}
            </Panel>

            <div ref={detailRef}>
              <Panel
                title="Evaluation detail"
                description={
                  selected
                    ? `${selected.item_name} · ${selected.versions.length} version(s)`
                    : "All versions for the selected evaluation"
                }
              >
                {!selected ? (
                  <EmptyState
                    title="No evaluation selected"
                    description="Choose a row above to inspect every version in the detail card."
                  />
                ) : (
                  <div>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <StatusPill
                        tone={selected.row_type === "human_review" ? "warning" : "info"}
                      >
                        {selected.row_type === "human_review"
                          ? "Human review"
                          : "Workflow"}
                      </StatusPill>
                      <span className="text-[13px] font-medium text-foreground">
                        {selected.item_name}
                      </span>
                      {selected.client_code || selected.client_name ? (
                        <span className="text-[12px] text-muted-foreground">
                          {asText(selected.client_name || selected.client_code)}
                        </span>
                      ) : null}
                      {selected.account_id ? (
                        <Link
                          to={`/payflow/cases/${selected.account_id}`}
                          className="text-[12.5px] font-medium text-primary hover:underline"
                        >
                          Open case
                        </Link>
                      ) : null}
                      {selected.strategy_id ? (
                        <Link
                          to={`/payflow/workflows/${selected.strategy_id}`}
                          className="text-[12.5px] font-medium text-primary hover:underline"
                        >
                          Open workflow
                        </Link>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      {selected.versions.map((v, i) => (
                        <VersionCard
                          key={`${selected.key}-${
                            v.row_type === "human_review"
                              ? `hr-${v.review_id ?? i}`
                              : `wv-v${v.version ?? i}-${i}`
                          }`}
                          row={v}
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
