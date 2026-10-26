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
  client_code?: string;
  client_name?: string;
  item_name: string;
  strategy_id?: number | null;
  latest: EvalRow;
  versions: EvalRow[];
};

function groupKeyForRow(row: EvalRow): string {
  if (row.strategy_id != null) return `wf-${row.strategy_id}`;
  return `wf-${row.strategy_code || row.strategy_name || "x"}`;
}

function versionSortValue(row: EvalRow): number {
  const v = Number(row.version);
  if (Number.isFinite(v)) return v;
  const stamp = String(row.event_date || "");
  const t = Date.parse(stamp);
  return Number.isFinite(t) ? t : 0;
}

/** One row per workflow version number (newest history snapshot wins). */
function dedupeVersions(versions: EvalRow[]): EvalRow[] {
  const seen = new Set<string>();
  const out: EvalRow[] = [];
  for (const row of versions) {
    const key = `wf-${row.strategy_id ?? ""}-v${row.version ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** One evaluation list row per workflow — versions expand in the detail panel. */
function buildEvalGroups(rows: EvalRow[]): EvalGroup[] {
  const map = new Map<string, EvalRow[]>();
  for (const row of rows) {
    // Case-level Human Review (rev-*) does not belong in AI eval — workflow versions only.
    if (row.row_type && row.row_type !== "workflow_version") continue;
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
    if (!latest) continue;
    groups.push({
      key,
      client_code: latest.client_code != null ? String(latest.client_code) : undefined,
      client_name: latest.client_name != null ? String(latest.client_name) : undefined,
      item_name: String(latest.strategy_name || latest.strategy_code || "Workflow"),
      strategy_id: latest.strategy_id != null ? Number(latest.strategy_id) : null,
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

function ChangesBlock({
  changes,
  priorChanges,
}: {
  changes: unknown;
  priorChanges?: unknown;
}) {
  const text = asText(changes);
  const prior = asText(priorChanges);
  if (text === "—" && prior === "—") {
    return (
      <div className="mt-3 rounded-md border border-border/70 bg-card px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          What changed
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          No step changes recorded for this version (status / activation only).
        </p>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {text !== "—" ? (
        <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            What changed in this version
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[13px] font-medium text-foreground">
            {text}
          </p>
        </div>
      ) : null}
      {prior !== "—" ? (
        <div className="rounded-md border border-border/70 bg-card px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Previous version changes
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[12px] text-muted-foreground">
            {prior}
          </p>
        </div>
      ) : null}
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
  const status = asText(row.status);
  const title = `Version ${asText(row.version)}`;
  const stepsMissing = Boolean(row.steps_snapshot_missing) || !Array.isArray(row.steps_detail);

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
          <StatusPill tone="info">{title}</StatusPill>
          <StatusPill tone={decisionTone(status)}>{status}</StatusPill>
          {row.origin ? <StatusPill>{asText(row.origin)}</StatusPill> : null}
          {row.changes_summary ? (
            <span className="max-w-[280px] truncate text-[11px] text-muted-foreground">
              {asText(row.changes_summary)}
            </span>
          ) : null}
          {defaultExpanded ? (
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Latest
            </span>
          ) : null}
        </div>
        {row.strategy_id ? (
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
          <ChangesBlock changes={row.changes_summary} priorChanges={row.prior_changes_summary} />
          <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
            <DetailField label="Status" value={row.status} />
            <DetailField label="Origin" value={row.origin} />
            <DetailField label="Event date" value={row.event_date} />
            <DetailField label="Approved by" value={row.approved_by} />
            <DetailField label="Approval date" value={row.approval_date} />
            <DetailField label="Steps count" value={row.steps_count} />
            <DetailField label="Note" value={row.note} />
            <DetailField label="Reviewer note" value={row.reviewer_note} />
            <DetailField label="Segment" value={row.segment_summary} />
          </div>
          {stepsMissing ? (
            <p className="mt-3 text-[12px] text-muted-foreground">
              Steps snapshot was not stored for this older history event. New versions will keep a
              full step list; use &quot;What changed&quot; above for the edit history.
            </p>
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
        description="One row per workflow. Expand a row to compare versions and see what changed."
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
          description="Choose a client scope and run Generate preview to inspect workflow version history."
        />
      ) : null}

      {preview ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Workflows"
              value={String(groups.length)}
              hint={`${performance?.workflow_versions ?? rows.length} version event(s)`}
            />
            <KpiCard
              label="AI-origin versions"
              value={String(performance?.ai_origin_versions ?? 0)}
              hint={`${performance?.human_created_versions ?? 0} human-created`}
            />
            <KpiCard
              label="Approved / active"
              value={
                performance?.approval_rate_pct != null
                  ? `${performance.approval_rate_pct}%`
                  : "—"
              }
              hint={`${performance?.hr_approved ?? 0} approved · ${performance?.hr_held ?? 0} in review`}
            />
            <KpiCard
              label="Versions with edits"
              value={String(performance?.hr_modified ?? 0)}
              hint={
                preview.export_reference
                  ? `Ref ${preview.export_reference}`
                  : "Step changes recorded in history"
              }
            />
          </div>

          <div className="space-y-5">
            <Panel
              title="Evaluation list"
              description={`${groups.length} workflow(s) · ${rows.length} version(s) · click a row to open version history below`}
            >
              {groups.length === 0 ? (
                <EmptyState
                  title="No evaluation rows"
                  description="No workflow versions in this scope yet."
                />
              ) : (
                <DataTable
                  minWidth={720}
                  head={["Client", "Workflow", "Latest status", "Versions"]}
                >
                  {groups.map((g) => {
                    const active = g.key === selectedKey;
                    const decision = asText(g.latest.status);
                    return (
                      <Tr
                        key={g.key}
                        className={active ? "bg-primary/5" : undefined}
                        onClick={() => selectRow(g.key)}
                      >
                        <Td>{asText(g.client_code || g.client_name)}</Td>
                        <Td className="max-w-[280px] truncate">{g.item_name}</Td>
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
                    : "Version history for the selected workflow"
                }
              >
                {!selected ? (
                  <EmptyState
                    title="No evaluation selected"
                    description="Choose a workflow above to inspect version history and changes."
                  />
                ) : (
                  <div>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <StatusPill tone="info">Workflow</StatusPill>
                      <span className="text-[13px] font-medium text-foreground">
                        {selected.item_name}
                      </span>
                      {selected.client_code || selected.client_name ? (
                        <span className="text-[12px] text-muted-foreground">
                          {asText(selected.client_name || selected.client_code)}
                        </span>
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
                          key={`${selected.key}-wv-v${v.version ?? i}-${i}`}
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
