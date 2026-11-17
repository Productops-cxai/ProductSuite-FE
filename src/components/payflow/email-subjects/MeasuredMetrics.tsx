import { formatCount, formatRate, metricCells } from "../../../lib/emailSubjectFormat";
import type { EmailSubjectMetrics } from "../../../types/emailSubjects";

export function MeasuredMetrics({
  metrics,
  compact = false,
}: {
  metrics?: Partial<EmailSubjectMetrics> | null;
  compact?: boolean;
}) {
  const cells = metricCells(metrics);
  if (!cells.length) {
    return <p className="text-[12px] text-slate-500 dark:text-slate-400">No measured sends in this period.</p>;
  }
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Measured performance
      </p>
      <dl className={compact ? "mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1" : "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3"}>
        {cells.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="tabular text-[12.5px] font-semibold text-slate-900 dark:text-slate-50">{value}</dd>
          </div>
        ))}
      </dl>
      {metrics?.low_sample ? (
        <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          Fewer deliveries than the minimum needed for a reliable rate.
        </p>
      ) : null}
      {metrics?.manual_sent ? (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {formatCount(metrics.manual_sent)} sent by hand. Payment-link clicks:{" "}
          {formatCount(metrics.payment_link_clicks)}. Emails with a payment:{" "}
          {formatCount(metrics.emails_with_payment)}.
        </p>
      ) : null}
      {!metrics?.manual_sent && (metrics?.payment_link_clicks || metrics?.emails_with_payment) ? (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Payment-link clicks {formatCount(metrics?.payment_link_clicks)}. Emails with a payment{" "}
          {formatCount(metrics?.emails_with_payment)}. Conversion {formatRate(metrics?.conversion)} of delivered.
        </p>
      ) : null}
    </div>
  );
}
