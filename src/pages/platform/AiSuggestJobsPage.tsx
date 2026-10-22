import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { listAiSuggestJobs, requeueMissingAiSuggestJobs } from "../../api/platform";
import { PageHeader } from "../../components/payflow-ui";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../../context/AuthContext";
import { ui } from "../../lib/ui";
import type { AiSuggestJob } from "../../types";

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

function statusClass(status: string): string {
  if (status === "failed") return "text-red-700 dark:text-red-300";
  if (status === "skipped") return "text-amber-700 dark:text-amber-300";
  if (status === "done") return "text-emerald-700 dark:text-emerald-300";
  if (status === "running" || status === "pending") return "text-slate-700 dark:text-slate-200";
  return "text-slate-700 dark:text-slate-200";
}

function triggerLabel(trigger: string): string {
  return trigger.replace(/_/g, " ");
}

function resultSummary(row: AiSuggestJob): string {
  if (row.status === "done") {
    const n = row.workflows_created ?? 0;
    return n === 1 ? "1 workflow created" : `${n} workflows created`;
  }
  if (row.status === "skipped") return row.skip_reason || "Skipped";
  if (row.status === "failed") return row.error_message || "Failed";
  if (row.status === "running") return "Running…";
  if (row.status === "pending") return "Queued";
  return row.skip_reason || row.error_message || "—";
}

export function AiSuggestJobsPage() {
  const { loading: authLoading, isSuperAdmin } = useAuth();
  const [rows, setRows] = useState<AiSuggestJob[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [requeueBusy, setRequeueBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(
        await listAiSuggestJobs({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          limit: 200,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load AI suggest jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, isSuperAdmin]);

  if (authLoading) return <div className={ui.loading}>Loading…</div>;
  if (!isSuperAdmin) return <div className={ui.error}>Platform Super Admin access required.</div>;

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  async function onRequeueMissing() {
    setRequeueBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await requeueMissingAiSuggestJobs();
      setInfo(
        res.enqueued > 0
          ? `Queued ${res.enqueued} AI suggest job(s). Refresh in a moment to see progress.`
          : "Nothing to queue — every active portfolio already has AI workflows or a job in flight.",
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to requeue AI suggest jobs");
    } finally {
      setRequeueBusy(false);
    }
  }

  return (
    <div className={ui.page}>
      <PageHeader
        title="AI Suggest Jobs"
        description="One row per client portfolio — when AI ran, what it created, or why it skipped. Use Re-queue missing after wiping strategies."
        breadcrumb={[{ label: "Logs" }, { label: "AI Suggest Jobs" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            <Button
              variant="primary"
              disabled={requeueBusy}
              onClick={() => void onRequeueMissing()}
            >
              {requeueBusy ? "Queuing…" : "Re-queue missing"}
            </Button>
          </div>
        }
      />

      {error ? <div className={ui.error}>{error}</div> : null}
      {info ? (
        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {info}
        </div>
      ) : null}

      <form className="mb-3.5 flex flex-wrap gap-3" onSubmit={onSearch}>
        <div className={ui.search}>
          <span className={ui.searchIcon}>
            <Icon name="search" />
          </span>
          <input
            className={ui.searchInput}
            placeholder="Search client, portfolio, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={ui.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="running">running</option>
          <option value="done">done</option>
          <option value="skipped">skipped</option>
          <option value="failed">failed</option>
        </select>
      </form>

      <div className={ui.card}>
        {loading ? (
          <div className={ui.empty}>Loading AI suggest jobs…</div>
        ) : rows.length === 0 ? (
          <div className={ui.empty}>
            No jobs yet. Use Re-queue missing for already-active clients, or activate a
            client/portfolio / complete an account import.
          </div>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>WHEN</th>
                <th className={ui.th}>CLIENT</th>
                <th className={ui.th}>PORTFOLIO</th>
                <th className={ui.th}>STATUS</th>
                <th className={ui.th}>TRIGGER</th>
                <th className={ui.th}>RESULT</th>
                <th className={ui.th}>DURATION</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={`${ui.td} whitespace-nowrap text-slate-500`}>
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </td>
                  <td className={ui.td}>
                    <strong>{row.client_name || `#${row.client_id}`}</strong>
                    {row.client_code ? <div className={ui.desc}>{row.client_code}</div> : null}
                  </td>
                  <td className={ui.td}>
                    <strong>{row.portfolio_name || `#${row.portfolio_id}`}</strong>
                    {row.portfolio_code ? (
                      <div className={ui.desc}>{row.portfolio_code}</div>
                    ) : null}
                  </td>
                  <td className={`${ui.td} font-semibold capitalize ${statusClass(row.status)}`}>
                    {row.status}
                  </td>
                  <td className={`${ui.td} capitalize`}>{triggerLabel(row.trigger)}</td>
                  <td className={ui.td}>
                    <div>{resultSummary(row)}</div>
                    {row.status === "done" && row.workflow_ids?.length ? (
                      <div className={ui.desc}>#{row.workflow_ids.join(", #")}</div>
                    ) : null}
                    {(row.segments_count != null || row.batches_count != null) &&
                    row.status === "done" ? (
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {row.segments_count ?? "—"} segments · {row.batches_count ?? "—"} batches
                      </div>
                    ) : null}
                  </td>
                  <td className={`${ui.td} whitespace-nowrap`}>
                    {formatDuration(row.duration_ms)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
