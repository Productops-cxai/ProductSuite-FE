import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listEmailLogs } from "../../api/platform";
import { EMAIL_LOGS_ADMIN_EMAIL } from "../../components/layout/PlatformLayout";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../../context/AuthContext";
import type { EmailLog } from "../../types";

export function EmailLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<EmailLog[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);

  const allowed = (user?.email || "").toLowerCase() === EMAIL_LOGS_ADMIN_EMAIL;

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(
        await listEmailLogs({
          search: search.trim() || undefined,
          email_type: typeFilter || undefined,
          limit: 200,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load email logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!allowed) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, allowed]);

  if (authLoading) return <div className="app-loading">Loading…</div>;
  if (!allowed) return <Navigate to="/platform" replace />;

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setInfo("Link copied to clipboard.");
    } catch {
      setInfo(link);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">Platform / Email Logs</div>
          <h1>Email Logs</h1>
          <p>
            SMTP is not configured yet. Outbound emails (activation, password reset) are saved here
            so you can open the action link and complete the flow. Visible only to{" "}
            {EMAIL_LOGS_ADMIN_EMAIL}.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {info ? <div className="success-banner">{info}</div> : null}

      <form className="toolbar" onSubmit={onSearch}>
        <div className="search-box">
          <Icon name="search" />
          <input
            placeholder="Search by email or subject"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          <option value="activation">Activation</option>
          <option value="password_reset">Password reset</option>
        </select>
      </form>

      <div className="table-card">
        {loading ? (
          <div className="empty-state">Loading email logs…</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No emails logged yet. Add a person to generate an invite.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>TO</th>
                <th>TYPE</th>
                <th>SUBJECT</th>
                <th>CREATED</th>
                <th>ACTION LINK</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <strong>{row.to_email}</strong>
                  </td>
                  <td>{row.email_type}</td>
                  <td className="desc-cell">{row.subject}</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td>
                    {row.action_link ? (
                      <div className="actions-cell">
                        <a href={row.action_link} target="_blank" rel="noreferrer">
                          <Button variant="secondary" size="sm">
                            Open
                          </Button>
                        </a>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void copyLink(row.action_link!)}
                        >
                          Copy
                        </Button>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
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
