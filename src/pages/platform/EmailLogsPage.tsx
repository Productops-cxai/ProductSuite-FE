import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listEmailLogs } from "../../api/platform";
import { PageHeader } from "../../components/payflow-ui";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { MobileRecordCard, MobileRecordCards } from "../../components/ui/MobileRecordCards";
import { Pagination } from "../../components/ui/Pagination";
import { useAuth } from "../../context/AuthContext";
import { useClientPagedList } from "../../hooks/useOffsetPagination";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ui } from "../../lib/ui";
import type { EmailLog } from "../../types";

const PAGE_SIZE = 10;

export function EmailLogsPage() {
  const { loading: authLoading, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<EmailLog[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const resetKey = `${search}|${typeFilter}`;
  const { pageItems, total, offset, pageSize, goPrev, goNext } = useClientPagedList(
    rows,
    PAGE_SIZE,
    resetKey,
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(
        await listEmailLogs({
          search: search.trim() || undefined,
          email_type: typeFilter || undefined,
          limit: 500,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load email logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, isSuperAdmin]);

  if (authLoading) return <div className={ui.loading}>Loading…</div>;
  if (!isSuperAdmin) return <Navigate to="/platform" replace />;

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  function actionFooter(row: EmailLog) {
    if (!row.action_link) {
      return (
        <span className="text-slate-500" title="One-time links are hidden in production">
          —
        </span>
      );
    }
    // Dev-only: API omits action_link in production. Still avoid copying raw tokens.
    return (
      <a href={row.action_link} target="_blank" rel="noreferrer noopener">
        <Button variant="secondary" size="sm">
          Open (dev)
        </Button>
      </a>
    );
  }

  return (
    <div className={ui.page}>
      <PageHeader
        title="Email Logs"
        description="Outbound emails (activation, password reset, collection). One-time action links are hidden in production. Visible only to the suite seed admin."
        breadcrumb={[{ label: "Logs" }, { label: "Email Logs" }]}
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? <div className={ui.error}>{error}</div> : null}

      <form className="mb-3.5 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3" onSubmit={onSearch}>
        <div className={ui.search}>
          <span className={ui.searchIcon}>
            <Icon name="search" />
          </span>
          <input
            className={ui.searchInput}
            placeholder="Search by email or subject"
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
          <option value="activation">Activation</option>
          <option value="password_reset">Password reset</option>
          <option value="collection_workflow">Collection workflow</option>
        </select>
      </form>

      <div className={ui.card}>
        {loading ? (
          <div className={ui.empty}>Loading email logs…</div>
        ) : rows.length === 0 ? (
          <div className={ui.empty}>No emails logged yet. Add a person to generate an invite.</div>
        ) : isMobile ? (
          <MobileRecordCards>
            {pageItems.map((row) => (
              <MobileRecordCard
                key={row.id}
                title={row.to_email}
                subtitle={row.subject}
                badges={
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {row.email_type}
                  </span>
                }
                meta={
                  <span>
                    #{row.id} · {new Date(row.created_at).toLocaleString()}
                  </span>
                }
                footer={actionFooter(row)}
              />
            ))}
          </MobileRecordCards>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>ID</th>
                <th className={ui.th}>TO</th>
                <th className={ui.th}>TYPE</th>
                <th className={ui.th}>SUBJECT</th>
                <th className={ui.th}>CREATED</th>
                <th className={ui.th}>ACTION LINK</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={row.id}>
                  <td className={ui.td}>{row.id}</td>
                  <td className={ui.td}>
                    <strong>{row.to_email}</strong>
                  </td>
                  <td className={ui.td}>{row.email_type}</td>
                  <td className={`${ui.td} ${ui.desc}`}>{row.subject}</td>
                  <td className={`${ui.td} whitespace-nowrap text-slate-500`}>
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className={ui.td}>
                    {row.action_link ? (
                      <div className={ui.cellActions}>{actionFooter(row)}</div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && total > 0 ? (
          <Pagination
            total={total}
            offset={offset}
            pageSize={pageSize}
            rowCount={pageItems.length}
            onPrevious={goPrev}
            onNext={goNext}
          />
        ) : null}
      </div>
    </div>
  );
}
