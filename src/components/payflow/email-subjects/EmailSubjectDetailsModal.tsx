import { useEffect, useState } from "react";
import { ApiError } from "../../../api/client";
import { getEmailSubjectDetails } from "../../../api/emailSubjects";
import { formatCount, formatRate, formatWhen } from "../../../lib/emailSubjectFormat";
import { Modal } from "../../ui/Modal";
import type { EmailSubjectDetails, EmailSubjectFilters } from "../../../types/emailSubjects";
import { EmailInsightPanel } from "./EmailInsightPanel";
import { MeasuredMetrics } from "./MeasuredMetrics";
import { SubjectTrendChart } from "./SubjectTrendChart";

export function EmailSubjectDetailsModal({
  filters,
  subjectKey,
  onSubjectKey,
  onClose,
}: {
  filters: EmailSubjectFilters;
  subjectKey: string | null;
  onSubjectKey: (subjectKey: string) => void;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [variationIndex, setVariationIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<EmailSubjectDetails | null>(null);

  useEffect(() => {
    setPeriod("daily");
    setVariationIndex(0);
  }, [subjectKey]);

  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    if (!subjectKey) {
      setData(null);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getEmailSubjectDetails(filters, subjectKey, period)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof ApiError ? err.detail : "Could not load this subject.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // filterKey is the stable identity of `filters`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey, period, filterKey]);

  const variation = data?.variations[variationIndex] || data?.variations[0];
  const stages = data?.reminder_stages?.length ? data.reminder_stages.join(" · ") : "Reminder stage not recorded";

  return (
    <Modal
      open={!!subjectKey}
      onClose={onClose}
      size="2xl"
      showClose
      title={data?.subject || "Subject details"}
      description={subjectKey ? stages : undefined}
      footer={
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      }
    >
      {loading && !data ? (
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}
      {data ? (
        <div className="space-y-5 text-slate-800">
          {data.contexts.length > 0 ? (
            <p className="text-[12px] text-slate-500">{data.contexts.join(" · ")}</p>
          ) : null}
          <MeasuredMetrics metrics={data.summary} />
          <EmailInsightPanel
            label="Generate AI Insights for this subject"
            request={{ ...filters, scope: "subject", subject_key: data.subject_key, search: undefined }}
          />

          <section>
            <h4 className="text-[13px] font-semibold">Communication to payment</h4>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {data.funnel.map((step) => (
                <div key={step.label} className="rounded-md border border-slate-200 px-2.5 py-2">
                  <p className="truncate text-[11px] font-medium text-slate-500">{step.label}</p>
                  <p className="tabular mt-1 text-[16px] font-bold">{formatCount(step.value)}</p>
                  <p className="tabular text-[10.5px] text-slate-400">{formatRate(step.pct_of_sent)} of sent</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-[13px] font-semibold">Performance trend</h4>
              <div className="flex rounded-md border border-slate-200 p-0.5 text-[12px]">
                {(["daily", "weekly"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPeriod(item)}
                    className={
                      period === item
                        ? "rounded bg-slate-900 px-2 py-1 text-white"
                        : "rounded px-2 py-1 text-slate-600"
                    }
                  >
                    {item === "daily" ? "Daily" : "Weekly"}
                  </button>
                ))}
              </div>
            </div>
            {loading ? <p className="text-[12px] text-slate-500">Updating chart…</p> : null}
            <SubjectTrendChart
              series={[
                { label: "Unique opens", points: data.trend.map((point) => ({ date: point.date, value: point.opens })) },
                { label: "Unique clicks", points: data.trend.map((point) => ({ date: point.date, value: point.clicks })) },
                { label: "Completed payments", points: data.trend.map((point) => ({ date: point.date, value: point.payments })) },
              ]}
              emptyLabel="No daily or weekly points for this subject in the selected dates."
            />
            {data.measurement.opens_are_estimated ? (
              <p className="mt-1 text-[11px] text-slate-400">Opens are estimates. Automatic mail-app opens are excluded.</p>
            ) : null}
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            <Breakdown title="By client" rows={data.breakdown.by_client} />
            <Breakdown title="By workflow" rows={data.breakdown.by_workflow} />
            <Breakdown title="By reminder stage" rows={data.breakdown.by_stage} />
          </section>

          <section>
            <h4 className="text-[13px] font-semibold">Sample email</h4>
            {data.variations.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-slate-500">No body variations were stored for this subject.</p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.variations.map((item, index) => (
                    <button
                      key={`${item.id ?? item.label}-${index}`}
                      type="button"
                      onClick={() => setVariationIndex(index)}
                      className={
                        index === variationIndex
                          ? "rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white"
                          : "rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {variation ? (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[12px] text-slate-500">
                      {[variation.origin, variation.language, variation.reminder_stage].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-[13px] font-medium">
                      Subject: {variation.subject || data.subject}
                    </p>
                    {variation.body ? (
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-slate-700">
                        {variation.body}
                      </pre>
                    ) : (
                      <p className="mt-2 text-[12.5px] text-slate-500">
                        No template body. This version was sent by hand.
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">
                      First used {formatWhen(variation.first_used_at)} · Last used {formatWhen(variation.last_used_at)}
                    </p>
                    <div className="mt-2">
                      <MeasuredMetrics metrics={variation} compact />
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section>
            <h4 className="text-[13px] font-semibold">Similar reminder subjects</h4>
            {data.similar.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-slate-500">No other subjects share this reminder stage.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {data.similar.map((row) => (
                  <li key={row.subject_key}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                      onClick={() => onSubjectKey(row.subject_key)}
                    >
                      <span>
                        <span className="block text-[13px] font-medium">{row.subject}</span>
                        <span className="block text-[11px] text-slate-500">
                          {(row.reminder_stages || []).join(", ") || "No stage"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[11px] text-slate-500">
                        {formatRate(row.open_rate)} opens
                        <br />
                        {formatCount(row.completed)} payments
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; delivered: number; completed: number; conversion: number }[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <h4 className="text-[12.5px] font-semibold">{title}</h4>
      {rows.length === 0 ? (
        <p className="mt-2 text-[12px] text-slate-500">None in this selection.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li key={`${title}-${row.label}`} className="text-[12px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{row.label}</span>
                <span className="tabular text-slate-500">{formatRate(row.conversion)}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {formatCount(row.delivered)} delivered · {formatCount(row.completed)} payments
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
