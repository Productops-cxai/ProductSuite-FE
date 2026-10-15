import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listSmsLogs } from "../../api/platform";
import { EMAIL_LOGS_ADMIN_EMAIL } from "../../components/layout/PlatformLayout";
import { PageHeader } from "../../components/payflow-ui";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../../context/AuthContext";
import { ui } from "../../lib/ui";
import type { SmsLog } from "../../types";

export function SmsLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<SmsLog[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const allowed = (user?.email || "").toLowerCase() === EMAIL_LOGS_ADMIN_EMAIL;

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(
        await listSmsLogs({
          search: search.trim() || undefined,
          sms_type: typeFilter || undefined,
          limit: 200,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load SMS logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!allowed) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, allowed]);

  if (authLoading) return <div className={ui.loading}>Loading…</div>;
  if (!allowed) return <Navigate to="/platform" replace />;

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  return (
    <div className={ui.page}>
      <PageHeader
        title="SMS Logs"
        description="Outbound collection SMS (Twilio when configured, otherwise log-only). Visible only to the suite admin."
        breadcrumb={[{ label: "Logs" }, { label: "SMS Logs" }]}
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
            placeholder="Search by phone or body"
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
          <option value="collection_workflow">Collection workflow</option>
        </select>
      </form>

      <div className={ui.card}>
        {loading ? (
          <div className={ui.empty}>Loading SMS logs…</div>
        ) : rows.length === 0 ? (
          <div className={ui.empty}>No SMS logged yet.</div>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>ID</th>
                <th className={ui.th}>TO</th>
                <th className={ui.th}>TYPE</th>
                <th className={ui.th}>STATUS</th>
                <th className={ui.th}>BODY</th>
                <th className={ui.th}>CREATED</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={ui.td}>{row.id}</td>
                  <td className={ui.td}>
                    <strong>{row.to_phone}</strong>
                  </td>
                  <td className={ui.td}>{row.sms_type}</td>
                  <td className={ui.td}>{row.status}</td>
                  <td className={`${ui.td} ${ui.desc}`}>{row.body.slice(0, 120)}</td>
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
