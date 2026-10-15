import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getWorkflowWorkerLog } from "../../api/platform";
import { PageHeader } from "../../components/payflow-ui";
import { Button } from "../../components/ui/Button";
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

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={ui.row}>
      <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <div className="text-right text-[13px] text-slate-900 dark:text-slate-100">{children}</div>
    </div>
  );
}

export function WorkerLogDetailPage() {
  const { logId } = useParams<{ logId: string }>();
  const navigate = useNavigate();
  const { loading: authLoading, isSuperAdmin } = useAuth();
  const [row, setRow] = useState<PayflowWorkflowWorkerLog | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin || !logId) return;
    const id = Number(logId);
    if (!Number.isFinite(id)) {
      setError("Invalid log id");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void getWorkflowWorkerLog(id)
      .then((data) => {
        if (!cancelled) setRow(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load worker log");
          setRow(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logId, isSuperAdmin]);

  if (authLoading) return <div className={ui.loading}>Loading…</div>;
  if (!isSuperAdmin) return <div className={ui.error}>Platform Super Admin access required.</div>;

  return (
    <div className={ui.page}>
      <PageHeader
        title={row ? eventLabel(row.event_type) : "Worker log"}
        description={
          row
            ? `${row.message}${row.created_at ? ` · ${new Date(row.created_at).toLocaleString()}` : ""}`
            : "Event detail with client, portfolio, account, and related timeline."
        }
        breadcrumb={[
          { label: "Logs" },
          { label: "Workflow Worker Logs", to: "/platform/worker-logs" },
          { label: logId ? `#${logId}` : "Detail" },
        ]}
        actions={
          <Button variant="secondary" onClick={() => navigate("/platform/worker-logs")}>
            Back to list
          </Button>
        }
      />

      {error ? <div className={ui.error}>{error}</div> : null}
      {loading ? <div className={ui.empty}>Loading…</div> : null}

      {!loading && row ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-5">
            <div className={ui.panel}>
              <div className={ui.panelHead}>
                <div>
                  <h2 className={ui.panelTitle}>What happened</h2>
                  <p className={ui.panelText}>Worker action and any extra detail from the run.</p>
                </div>
                <span className={`text-[12px] font-semibold uppercase ${levelClass(row.level)}`}>
                  {row.level}
                </span>
              </div>
              <p className="text-[14px] leading-relaxed text-slate-800 dark:text-slate-100">
                {row.message}
              </p>
              {row.detail ? (
                <pre className="mt-4 max-h-64 overflow-auto rounded-md border border-slate-100 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  {row.detail}
                </pre>
              ) : null}
            </div>

            <div className={ui.panel}>
              <div className={ui.panelHead}>
                <div>
                  <h2 className={ui.panelTitle}>Related timeline</h2>
                  <p className={ui.panelText}>
                    Other worker events on the same run, account, job, or strategy.
                  </p>
                </div>
              </div>
              {!row.related_events?.length ? (
                <div className="py-4 text-center text-[13px] text-slate-500">No related events.</div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {row.related_events.map((ev) => (
                    <li key={ev.id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        to={`/platform/worker-logs/${ev.id}`}
                        className="block hover:opacity-90"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-[13px] font-semibold capitalize text-slate-900 dark:text-slate-100">
                            {eventLabel(ev.event_type)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {ev.created_at ? new Date(ev.created_at).toLocaleString() : "—"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-slate-600 dark:text-slate-300">
                          {ev.message}
                        </p>
                        {(ev.account_reference || ev.customer_name) && (
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {[ev.account_reference, ev.customer_name].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={ui.panel}>
            <div className={ui.panelHead}>
              <div>
                <h2 className={ui.panelTitle}>Context</h2>
                <p className={ui.panelText}>Where this action ran.</p>
              </div>
            </div>
            <MetaRow label="Client">
              {row.client_name || row.client_id != null ? (
                <div>
                  <strong>{row.client_name || `#${row.client_id}`}</strong>
                  {row.client_code ? (
                    <div className={ui.personSub}>{row.client_code}</div>
                  ) : null}
                </div>
              ) : (
                "—"
              )}
            </MetaRow>
            <MetaRow label="Portfolio">
              {row.portfolio_name || row.portfolio_id != null ? (
                <div>
                  <strong>{row.portfolio_name || `#${row.portfolio_id}`}</strong>
                  {row.portfolio_code ? (
                    <div className={ui.personSub}>{row.portfolio_code}</div>
                  ) : null}
                </div>
              ) : (
                "—"
              )}
            </MetaRow>
            <MetaRow label="Account">
              {row.account_reference || row.customer_name || row.account_id != null ? (
                <div>
                  <strong>
                    {row.account_reference || row.customer_name || `#${row.account_id}`}
                  </strong>
                  {row.customer_name && row.account_reference ? (
                    <div className={ui.personSub}>{row.customer_name}</div>
                  ) : null}
                </div>
              ) : (
                "—"
              )}
            </MetaRow>
            <MetaRow label="Strategy">
              {row.strategy_name || row.strategy_id != null ? (
                <div>
                  <strong>{row.strategy_name || `#${row.strategy_id}`}</strong>
                  {row.strategy_code ? (
                    <div className={ui.personSub}>{row.strategy_code}</div>
                  ) : null}
                </div>
              ) : (
                "—"
              )}
            </MetaRow>
            <MetaRow label="Step">{row.step_id || "—"}</MetaRow>
            <MetaRow label="Run">{row.run_id != null ? `#${row.run_id}` : "—"}</MetaRow>
            <MetaRow label="Job">{row.job_id != null ? `#${row.job_id}` : "—"}</MetaRow>
            <MetaRow label="Log ID">#{row.id}</MetaRow>
            <MetaRow label="When">
              {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
            </MetaRow>
          </div>
        </div>
      ) : null}
    </div>
  );
}
