import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { listPayflowWorkflowWorkerLogs } from "../../api/payflow";
import { PageHeader } from "../../components/payflow-ui";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ui } from "../../lib/ui";
import type { PayflowWorkflowWorkerLog } from "../../types";

export function PayFlowWorkerLogsPage() {
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
      const res = await listPayflowWorkflowWorkerLogs({
        search: search.trim() || undefined,
        event_type: eventFilter || undefined,
        level: levelFilter || undefined,
        limit: 200,
      });
      setRows(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load worker logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, levelFilter]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  return (
    <div className={ui.page}>
      <PageHeader
        title="Workflow Worker Logs"
        description="Monitor enrollment, step execution, waits, rule blocks, human-review pauses, and provider sends."
        breadcrumb={[{ label: "AI Operations" }, { label: "Worker Logs" }]}
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
            placeholder="Search message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={ui.select}
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          <option value="">All events</option>
          <option value="enroll_queued">enroll_queued</option>
          <option value="account_enrolled">account_enrolled</option>
          <option value="step_done">step_done</option>
          <option value="step_failed">step_failed</option>
          <option value="rule_matched">rule_matched</option>
          <option value="human_review_paused">human_review_paused</option>
          <option value="run_superseded">run_superseded</option>
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
            No worker events yet. Activate a workflow and run{" "}
            <code className="text-xs">python -m app.worker</code>.
          </div>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>ID</th>
                <th className={ui.th}>LEVEL</th>
                <th className={ui.th}>EVENT</th>
                <th className={ui.th}>MESSAGE</th>
                <th className={ui.th}>ACCOUNT</th>
                <th className={ui.th}>RUN</th>
                <th className={ui.th}>WHEN</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={ui.td}>{row.id}</td>
                  <td className={ui.td}>{row.level}</td>
                  <td className={ui.td}>{row.event_type}</td>
                  <td className={`${ui.td} ${ui.desc}`}>{row.message}</td>
                  <td className={ui.td}>{row.account_id ?? "—"}</td>
                  <td className={ui.td}>{row.run_id ?? "—"}</td>
                  <td className={`${ui.td} whitespace-nowrap text-slate-500`}>
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
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
