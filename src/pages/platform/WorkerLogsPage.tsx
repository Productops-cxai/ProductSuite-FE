import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listWorkflowWorkerLogs } from "../../api/platform";
import { PageHeader } from "../../components/payflow-ui";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../../context/AuthContext";
import { ui } from "../../lib/ui";
import type { PayflowWorkflowWorkerLog } from "../../types";

function levelClass(level: string): string {
  if (level === "error") return "text-red-700 dark:text-red-300";
  if (level === "warn") return "text-amber-700 dark:text-amber-300";
  return "text-slate-700 dark:text-slate-200";
}

function eventLabel(eventType: string): string {
  return eventType.replace(/_/g, " ");
}

export function WorkerLogsPage() {
  const navigate = useNavigate();
  const { loading: authLoading, isSuperAdmin } = useAuth();
  const [rows, setRows] = useState<PayflowWorkflowWorkerLog[]>([]);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(
        await listWorkflowWorkerLogs({
          search: search.trim() || undefined,
          event_type: eventFilter || undefined,
          level: levelFilter || undefined,
          limit: 200,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load worker logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, levelFilter, isSuperAdmin]);

  if (authLoading) return <div className={ui.loading}>Loading…</div>;
  if (!isSuperAdmin) return <div className={ui.error}>Platform Super Admin access required.</div>;

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  return (
    <div className={ui.page}>
      <PageHeader
        title="Workflow Worker Logs"
        description="One row per account run — client, portfolio, and what happened. Open Details for the full step timeline."
        breadcrumb={[{ label: "Logs" }, { label: "Workflow Worker Logs" }]}
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
            placeholder="Search client, portfolio, account, message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={ui.select}
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          <option value="">All outcomes</option>
          <option value="account_enrolled">account enrolled</option>
          <option value="step_done">step done</option>
          <option value="step_failed">step failed</option>
          <option value="step_skipped">step skipped</option>
          <option value="rule_matched">rule matched</option>
          <option value="human_review_paused">human review paused</option>
          <option value="run_superseded">run superseded</option>
        </select>
        <select
          className={ui.select}
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="">All levels</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
      </form>

      <div className={ui.card}>
        {loading ? (
          <div className={ui.empty}>Loading worker logs…</div>
        ) : rows.length === 0 ? (
          <div className={ui.empty}>
            No worker events yet. Activate a workflow and keep{" "}
            <code className="text-xs">python -m app.worker</code> running.
          </div>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>WHEN</th>
                <th className={ui.th}>CLIENT</th>
                <th className={ui.th}>PORTFOLIO</th>
                <th className={ui.th}>ACCOUNT</th>
                <th className={ui.th}>WHAT HAPPENED</th>
                <th className={ui.th}>LEVEL</th>
                <th className={ui.th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const steps = row.event_count && row.event_count > 1 ? row.event_count : null;
                return (
                  <tr
                    key={row.group_key || row.id}
                    className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    onClick={() => navigate(`/platform/worker-logs/${row.id}`)}
                  >
                    <td className={`${ui.td} whitespace-nowrap text-slate-500`}>
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                    </td>
                    <td className={ui.td}>
                      {row.client_name || row.client_id != null ? (
                        <>
                          <strong>{row.client_name || `#${row.client_id}`}</strong>
                          {row.client_code ? (
                            <div className={ui.desc}>{row.client_code}</div>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={ui.td}>
                      {row.portfolio_name || row.portfolio_id != null ? (
                        <>
                          <strong>{row.portfolio_name || `#${row.portfolio_id}`}</strong>
                          {row.portfolio_code ? (
                            <div className={ui.desc}>{row.portfolio_code}</div>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={ui.td}>
                      {row.account_reference || row.customer_name || row.account_id != null ? (
                        <>
                          <strong>
                            {row.account_reference ||
                              row.customer_name ||
                              `#${row.account_id}`}
                          </strong>
                          {row.customer_name && row.account_reference ? (
                            <div className={ui.desc}>{row.customer_name}</div>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={ui.td}>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium capitalize text-slate-900 dark:text-slate-100">
                          {eventLabel(row.event_type)}
                        </span>
                        {steps ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {steps} steps
                          </span>
                        ) : null}
                      </div>
                      <div className={`mt-0.5 ${ui.desc}`}>{row.message}</div>
                      {row.step_summary ? (
                        <div className="mt-0.5 text-[11px] capitalize text-slate-500">
                          {row.step_summary.replace(/_/g, " ")}
                        </div>
                      ) : row.strategy_name ? (
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {row.strategy_name}
                        </div>
                      ) : null}
                    </td>
                    <td className={`${ui.td} font-semibold ${levelClass(row.level)}`}>
                      {row.level}
                    </td>
                    <td className={ui.td} onClick={(e) => e.stopPropagation()}>
                      <Link to={`/platform/worker-logs/${row.id}`} className={ui.link}>
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
