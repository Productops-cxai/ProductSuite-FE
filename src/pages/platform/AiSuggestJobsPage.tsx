import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { listAiSuggestJobs } from "../../api/platform";
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

export function AiSuggestJobsPage() {
  const { loading: authLoading, isSuperAdmin } = useAuth();
  const [rows, setRows] = useState<AiSuggestJob[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  return (
    <div className={ui.page}>
      <PageHeader
        title="AI Suggest Jobs"
        description="Auto workflow suggestion runs after account import or when a client/portfolio becomes active. Shows pending, skipped, failed, and completed jobs."
        breadcrumb={[{ label: "Logs" }, { label: "AI Suggest Jobs" }]}
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? <div className={ui.error}>{error}</div> : null}

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
            No jobs yet. Activate a client/portfolio with accounts, or complete an account import.
          </div>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>ID</th>
                <th className={ui.th}>STATUS</th>
                <th className={ui.th}>TRIGGER</th>
                <th className={ui.th}>CLIENT</th>
                <th className={ui.th}>PORTFOLIO</th>
                <th className={ui.th}>WORKFLOWS</th>
                <th className={ui.th}>BATCHES</th>
                <th className={ui.th}>DURATION</th>
                <th className={ui.th}>DETAIL</th>
                <th className={ui.th}>CREATED</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={ui.td}>{row.id}</td>
                  <td className={ui.td}>
                    <strong>{row.status}</strong>
                  </td>
                  <td className={ui.td}>{row.trigger}</td>
                  <td className={ui.td}>
                    <strong>{row.client_name || row.client_id}</strong>
                    {row.client_code ? (
                      <div className={ui.desc}>{row.client_code}</div>
                    ) : null}
                  </td>
                  <td className={ui.td}>
                    <strong>{row.portfolio_name || row.portfolio_id}</strong>
                    {row.portfolio_code ? (
                      <div className={ui.desc}>{row.portfolio_code}</div>
                    ) : null}
                  </td>
                  <td className={ui.td}>
                    {row.workflows_created}
                    {row.workflow_ids?.length ? (
                      <div className={ui.desc}>#{row.workflow_ids.join(", #")}</div>
                    ) : null}
                  </td>
                  <td className={ui.td}>
                    {row.segments_count != null || row.batches_count != null
                      ? `${row.segments_count ?? "—"} seg / ${row.batches_count ?? "—"} batch`
                      : "—"}
                  </td>
                  <td className={`${ui.td} whitespace-nowrap`}>{formatDuration(row.duration_ms)}</td>
                  <td className={`${ui.td} ${ui.desc} max-w-xs`}>
                    {row.skip_reason || row.error_message || "—"}
                  </td>
                  <td className={`${ui.td} whitespace-nowrap text-slate-500`}>
                    {new Date(row.created_at).toLocaleString()}
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
