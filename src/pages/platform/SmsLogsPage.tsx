import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { listSmsLogs } from "../../api/platform";
import { PageHeader } from "../../components/payflow-ui";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { MobileRecordCard, MobileRecordCards } from "../../components/ui/MobileRecordCards";
import { Pagination } from "../../components/ui/Pagination";
import { useAuth } from "../../context/AuthContext";
import { useClientPagedList } from "../../hooks/useOffsetPagination";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ui } from "../../lib/ui";
import type { SmsLog } from "../../types";

const PAGE_SIZE = 10;

function statusTone(status: string): "success" | "danger" | "warning" | "neutral" {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "logged") return "warning";
  return "neutral";
}

function typeLabel(smsType: string): string {
  return smsType.replace(/_/g, " ");
}

export function SmsLogsPage() {
  const { loading: authLoading, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<SmsLog[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
        await listSmsLogs({
          search: search.trim() || undefined,
          sms_type: typeFilter || undefined,
          limit: 500,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load SMS logs");
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

  function messageBlock(row: SmsLog) {
    const open = expandedId === row.id;
    const preview =
      row.body.length > 140 && !open ? `${row.body.slice(0, 140)}…` : row.body;
    return (
      <>
        <div className="whitespace-pre-wrap break-words">{preview}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] capitalize text-slate-500">{typeLabel(row.sms_type)}</span>
          {row.body.length > 140 ? (
            <button
              type="button"
              className="text-[11px] font-semibold text-primary hover:underline"
              onClick={() => setExpandedId(open ? null : row.id)}
            >
              {open ? "Show less" : "Show full message"}
            </button>
          ) : null}
        </div>
        {open && row.provider_id ? (
          <div className={`${ui.personSub} mt-1`}>SID: {row.provider_id}</div>
        ) : null}
      </>
    );
  }

  return (
    <div className={ui.page}>
      <PageHeader
        title="SMS Logs"
        description="Outbound collection SMS (Twilio when configured, otherwise log-only). Shows who received the message, which account, and the full body. Visible only to the suite admin."
        breadcrumb={[{ label: "Logs" }, { label: "SMS Logs" }]}
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
            placeholder="Search phone, name, account, client, or message…"
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
        ) : isMobile ? (
          <MobileRecordCards>
            {pageItems.map((row) => (
              <MobileRecordCard
                key={row.id}
                title={row.to_phone}
                subtitle={row.customer_name || undefined}
                badges={<Badge tone={statusTone(row.status)}>{row.status}</Badge>}
                meta={
                  <div className="space-y-1.5">
                    <p>
                      {new Date(row.created_at).toLocaleString()} · #{row.id}
                    </p>
                    <p>
                      Account:{" "}
                      {row.account_reference ||
                        row.customer_name ||
                        (row.account_id != null ? `#${row.account_id}` : "—")}
                      {row.run_id != null ? ` · Run #${row.run_id}` : ""}
                    </p>
                    <p>
                      Client:{" "}
                      {row.client_name ||
                        row.client_code ||
                        (row.client_id != null ? `#${row.client_id}` : "—")}
                    </p>
                    <div className="text-foreground">{messageBlock(row)}</div>
                    {row.error ? (
                      <p className="text-[11px] leading-snug text-red-600 dark:text-red-300">
                        {row.error}
                      </p>
                    ) : null}
                  </div>
                }
              />
            ))}
          </MobileRecordCards>
        ) : (
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>WHEN</th>
                <th className={ui.th}>RECIPIENT</th>
                <th className={ui.th}>ACCOUNT</th>
                <th className={ui.th}>CLIENT</th>
                <th className={ui.th}>MESSAGE</th>
                <th className={ui.th}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={row.id}>
                  <td className={`${ui.td} whitespace-nowrap text-slate-500`}>
                    {new Date(row.created_at).toLocaleString()}
                    <div className={ui.personSub}>#{row.id}</div>
                  </td>
                  <td className={ui.td}>
                    <strong className={ui.person}>{row.to_phone}</strong>
                    {row.customer_name ? (
                      <div className={ui.personSub}>{row.customer_name}</div>
                    ) : null}
                  </td>
                  <td className={ui.td}>
                    {row.account_reference || row.customer_name || row.account_id != null ? (
                      <>
                        <span className={ui.person}>
                          {row.account_reference ||
                            row.customer_name ||
                            `#${row.account_id}`}
                        </span>
                        {row.customer_name && row.account_reference ? (
                          <div className={ui.personSub}>{row.customer_name}</div>
                        ) : null}
                        {row.run_id != null ? (
                          <div className={ui.personSub}>Run #{row.run_id}</div>
                        ) : null}
                      </>
                    ) : (
                      <span className={ui.muted}>—</span>
                    )}
                  </td>
                  <td className={ui.td}>
                    {row.client_name || row.client_code || row.client_id != null ? (
                      <>
                        <span className={ui.person}>
                          {row.client_name || row.client_code || `#${row.client_id}`}
                        </span>
                        {row.client_code && row.client_name ? (
                          <div className={ui.personSub}>{row.client_code}</div>
                        ) : null}
                      </>
                    ) : (
                      <span className={ui.muted}>—</span>
                    )}
                  </td>
                  <td className={`${ui.td} ${ui.desc} max-w-[360px]`}>{messageBlock(row)}</td>
                  <td className={ui.td}>
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    {row.error ? (
                      <div className="mt-1.5 max-w-[200px] text-[11px] leading-snug text-red-600 dark:text-red-300">
                        {row.error}
                      </div>
                    ) : null}
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
