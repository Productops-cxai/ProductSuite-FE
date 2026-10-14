import { FormEvent, useEffect, useState } from "react";
import { Fragment } from "react";
import { ApiError } from "../../api/client";
import { listDeletionLogs } from "../../api/platform";
import { listPayflowDeletionLogs } from "../../api/payflow";
import { PageHeader } from "../../components/payflow-ui";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ui } from "../../lib/ui";
import { useOptionalPayFlowAccess } from "../../context/PayFlowAccessContext";
import type { DeletionLog } from "../../types";

type Props = {
  workspace: "platform" | "payflow";
};

export function DeletionLogsPage({ workspace }: Props) {
  const payflow = useOptionalPayFlowAccess();
  const [rows, setRows] = useState<DeletionLog[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {
        search: search.trim() || undefined,
        entity_type: typeFilter || undefined,
        limit: 200,
      };
      setRows(
        workspace === "payflow"
          ? await listPayflowDeletionLogs(params)
          : await listDeletionLogs(params),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load deletion logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, workspace]);

  if (workspace === "payflow" && payflow && !payflow.loading && !payflow.isOperationsAdmin) {
    return (
      <p className="text-sm text-slate-500">
        Only an Operations Admin can view deletion logs.
      </p>
    );
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  const types = Array.from(new Set(rows.map((r) => r.entity_type))).sort();

  return (
    <div className={workspace === "platform" ? ui.page : undefined}>
      <PageHeader
        title="Deletion Logs"
        description="Every admin delete is recorded here: who did it, from which page, what the record contained, and which related rows were removed."
        breadcrumb={
          workspace === "platform"
            ? [{ label: "Logs" }, { label: "Deletion Logs" }]
            : [{ label: "Administration" }, { label: "Deletion Logs" }]
        }
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? <div className={ui.error}>{error}</div> : null}

      <form className="mb-3.5 flex flex-wrap gap-3" onSubmit={(e) => void onSearch(e)}>
        <div className={ui.search}>
          <span className={ui.searchIcon}>
            <Icon name="search" />
          </span>
          <input
            className={ui.searchInput}
            placeholder="Search record, actor, or page"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={ui.select}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </form>

      <div className={ui.card}>
        {loading ? (
          <div className={ui.empty}>Loading deletion logs…</div>
        ) : rows.length === 0 ? (
          <div className={ui.empty}>No deletions recorded yet.</div>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>WHEN</th>
                <th className={ui.th}>ACTIVITY</th>
                <th className={ui.th}>RECORD</th>
                <th className={ui.th}>WHO</th>
                <th className={ui.th}>FROM</th>
                <th className={ui.th}>RELATED</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const open = openId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr>
                      <td className={ui.td}>
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </td>
                      <td className={ui.td}>
                        <strong>{row.activity}</strong>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{row.entity_type}</span>
                      </td>
                      <td className={ui.td}>
                        <strong>{row.entity_label}</strong>
                        <span className="mt-0.5 block font-mono text-[11px] text-slate-500">
                          {row.entity_id}
                        </span>
                      </td>
                      <td className={ui.td}>
                        {row.actor_name}
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          {row.actor_email} · {row.actor_role}
                        </span>
                      </td>
                      <td className={`${ui.td} font-mono text-[12px]`}>{row.source || "—"}</td>
                      <td className={ui.td}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setOpenId(open ? null : row.id)}
                        >
                          {(row.related_deleted?.length || 0) + " related"}
                        </Button>
                      </td>
                    </tr>
                    {open ? (
                      <tr>
                        <td className={ui.td} colSpan={6}>
                          <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] text-slate-700">
                            {JSON.stringify(
                              {
                                record: row.record_snapshot,
                                related_deleted: row.related_deleted,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
