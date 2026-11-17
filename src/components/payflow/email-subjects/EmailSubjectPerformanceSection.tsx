import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../api/client";
import { getEmailSubjectsTrend, listEmailSubjects } from "../../../api/emailSubjects";
import { FilterBar, FilterSelect, KpiCard, KpiGrid, Panel } from "../../payflow-ui";
import { usePayFlowAccess } from "../../../context/PayFlowAccessContext";
import { formatCount, formatRate } from "../../../lib/emailSubjectFormat";
import type {
  EmailSubjectFilters,
  EmailSubjectRow,
  EmailSubjectsResponse,
  EmailSubjectsTrendResponse,
} from "../../../types/emailSubjects";
import { EmailInsightPanel } from "./EmailInsightPanel";
import { EmailSubjectDetailsModal } from "./EmailSubjectDetailsModal";
import { SubjectTrendChart } from "./SubjectTrendChart";

const DATE_LABELS: Record<string, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  custom: "Custom range",
};

const SORTS: { key: string; label: string }[] = [
  { key: "subject", label: "Subject" },
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "opens", label: "Opens" },
  { key: "open_rate", label: "Open rate" },
  { key: "clicks", label: "Clicks" },
  { key: "click_rate", label: "Click rate" },
  { key: "initiated", label: "Initiated" },
  { key: "completed", label: "Payments" },
  { key: "conversion", label: "Conversion" },
];

function cell(row: EmailSubjectRow, key: string) {
  switch (key) {
    case "sent":
      return formatCount(row.sent);
    case "delivered":
      return formatCount(row.delivered);
    case "opens":
      return formatCount(row.opens);
    case "open_rate":
      return formatRate(row.open_rate);
    case "clicks":
      return formatCount(row.clicks);
    case "click_rate":
      return formatRate(row.click_rate);
    case "initiated":
      return formatCount(row.initiated);
    case "completed":
      return formatCount(row.completed);
    case "conversion":
      return formatRate(row.conversion);
    default:
      return "";
  }
}

export function EmailSubjectPerformanceSection({
  initialClientId,
  initialDateRange,
}: {
  initialClientId?: string;
  initialDateRange?: string;
}) {
  const { loading: accessLoading, hasPermission } = usePayFlowAccess();
  const canView = hasPermission("view_analytics");
  const [dateRange, setDateRange] = useState(
    initialDateRange && ["today", "7d", "30d", "custom"].includes(initialDateRange)
      ? initialDateRange
      : "30d",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientId, setClientId] = useState(
    initialClientId && initialClientId !== "all" ? initialClientId : "",
  );
  const [portfolioIds, setPortfolioIds] = useState<number[]>([]);
  const [strategyId, setStrategyId] = useState("");
  const [reminderStage, setReminderStage] = useState("");
  const [purpose, setPurpose] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [sort, setSort] = useState("completed");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [groupBy, setGroupBy] = useState<"overall" | "client" | "workflow" | "stage">("overall");
  const [trendPeriod, setTrendPeriod] = useState<"daily" | "weekly">("daily");
  const [data, setData] = useState<EmailSubjectsResponse | null>(null);
  const [trend, setTrend] = useState<EmailSubjectsTrendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState("");
  const [trendError, setTrendError] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const dateInvalid =
    dateRange === "custom" && (!dateFrom || !dateTo || dateFrom > dateTo);

  const filters: EmailSubjectFilters = useMemo(
    () => ({
      date_range: dateRange,
      date_from: dateRange === "custom" ? dateFrom : undefined,
      date_to: dateRange === "custom" ? dateTo : undefined,
      client_id: clientId ? Number(clientId) : undefined,
      portfolio_ids: clientId ? portfolioIds : [],
      strategy_id: strategyId ? Number(strategyId) : undefined,
      reminder_stage: reminderStage || undefined,
      purpose: purpose || undefined,
      search: search || undefined,
    }),
    [dateRange, dateFrom, dateTo, clientId, portfolioIds, strategyId, reminderStage, purpose, search],
  );

  useEffect(() => {
    if (accessLoading || !canView || dateInvalid) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    listEmailSubjects(filters, sort, order)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof ApiError ? err.detail : "Could not load email subject performance.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessLoading, canView, dateInvalid, filters, sort, order]);

  useEffect(() => {
    if (accessLoading || !canView || dateInvalid) return;
    let cancelled = false;
    setTrendLoading(true);
    setTrendError("");
    getEmailSubjectsTrend(filters, groupBy, trendPeriod)
      .then((response) => {
        if (!cancelled) setTrend(response);
      })
      .catch((err) => {
        if (!cancelled) {
          setTrend(null);
          setTrendError(err instanceof ApiError ? err.detail : "Could not load the performance trend.");
        }
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessLoading, canView, dateInvalid, filters, groupBy, trendPeriod]);

  const options = data?.filter_options;
  const clients = options?.clients || [];
  const portfolios = (options?.portfolios || []).filter(
    (item) => !clientId || String(item.client_id ?? "") === clientId,
  );
  const workflows = (options?.workflows || []).filter(
    (item) => !clientId || item.client_id == null || String(item.client_id) === clientId,
  );
  const stages = options?.reminder_stages?.length
    ? options.reminder_stages
    : ["First reminder", "Second reminder", "Final reminder", "Payment plan", "Promise to pay"];
  const purposes = options?.purposes || [];
  const dateRanges = options?.date_ranges?.length
    ? options.date_ranges
    : ["30d", "7d", "today", "custom"];

  function resetFilters() {
    setDateRange("30d");
    setDateFrom("");
    setDateTo("");
    setClientId("");
    setPortfolioIds([]);
    setStrategyId("");
    setReminderStage("");
    setPurpose("");
    setSearchInput("");
    setSearch("");
    setSort("completed");
    setOrder("desc");
  }

  function toggleSort(key: string) {
    if (sort === key) {
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(key);
    setOrder(key === "subject" ? "asc" : "desc");
  }

  const leaders = [
    {
      id: "opened",
      label: "Most Opened",
      metric: "opens" as const,
      row: data?.leaders.opened,
      value: data?.leaders.opened ? formatRate(data.leaders.opened.open_rate) : "—",
    },
    {
      id: "clicked",
      label: "Most Clicked",
      metric: "clicks" as const,
      row: data?.leaders.clicked,
      value: data?.leaders.clicked ? formatRate(data.leaders.clicked.click_rate) : "—",
    },
    {
      id: "payments",
      label: "Best Payments",
      metric: "completed" as const,
      row: data?.leaders.payments,
      value: data?.leaders.payments ? formatCount(data.leaders.payments.completed) : "—",
    },
    {
      id: "conversion",
      label: "Best Conversion",
      metric: "conversion" as const,
      row: data?.leaders.conversion,
      value: data?.leaders.conversion ? formatRate(data.leaders.conversion.conversion) : "—",
    },
  ];

  if (!accessLoading && !canView) {
    return (
      <Panel
        title="Email Subject Performance"
        description="Subject-level email results sit here, after communication performance and before payment outcomes."
      >
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Analytics access is required to view email subject performance for your clients.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Email Subject Performance"
      description="Which subjects were opened, clicked, and paid. Rates use delivered emails as the denominator."
      action={
        <button
          type="button"
          onClick={() => setNotesOpen((open) => !open)}
          className="text-[12px] font-medium text-primary"
        >
          {notesOpen ? "Hide measurement notes" : "Measurement notes"}
        </button>
      }
    >
      {notesOpen && data?.measurement ? (
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          <p>Rates use {data.measurement.rate_denominator} as the denominator and are shown as percentages.</p>
          <p className="mt-1">
            Conversion is treated as reliable from {formatCount(data.measurement.min_deliveries)} delivered
            emails. Subjects below that are marked as a low sample.
          </p>
          <p className="mt-1">
            Payments are credited within             {data.measurement.attribution_window_days} days (
            {data.measurement.attribution_rule.split("_").join(" ")}).
          </p>
          <p className="mt-1">
            {data.measurement.opens_are_estimated
              ? "Opens are estimates. Automatic opens by mail apps are excluded."
              : "Opens are counted from tracking events."}
          </p>
          <p className="mt-1">
            {formatCount(data.unattributed_payments)} successful payments in this period could not be credited
            to a message.
          </p>
        </div>
      ) : null}

      <FilterBar>
        <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 dark:border-slate-600 dark:bg-slate-900">
          <span className="shrink-0 text-[11px] font-medium text-slate-500">Search</span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Subject text"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-900 outline-none dark:text-slate-100"
            aria-label="Search subjects"
          />
        </label>
        <FilterSelect
          label="Date"
          value={dateRange}
          onChange={setDateRange}
          options={dateRanges.map((value) => ({ value, label: DATE_LABELS[value] || value }))}
        />
        <FilterSelect
          label="Client"
          value={clientId || "all"}
          onChange={(value) => {
            setClientId(value === "all" ? "" : value);
            setPortfolioIds([]);
            setStrategyId("");
          }}
          options={[
            { value: "all", label: "All clients" },
            ...clients.map((client) => ({ value: String(client.id), label: client.name })),
          ]}
        />
        <button
          type="button"
          onClick={() => setAdvanced((open) => !open)}
          className="h-9 rounded-md border border-slate-200 px-3 text-[12px] font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          {advanced ? "Hide advanced" : "Advanced filters"}
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="h-9 rounded-md px-3 text-[12px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          Reset
        </button>
      </FilterBar>

      {dateRange === "custom" ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[12px] text-slate-500">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex items-center gap-2 text-[12px] text-slate-500">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      ) : null}
      {dateInvalid ? (
        <p className="mb-3 text-[12.5px] text-amber-700 dark:text-amber-300">
          Choose a start date on or before the end date.
        </p>
      ) : null}

      {advanced ? (
        <FilterBar>
          <FilterSelect
            label="Workflow"
            value={strategyId || "all"}
            onChange={(value) => setStrategyId(value === "all" ? "" : value)}
            options={[
              { value: "all", label: "All workflows" },
              ...workflows.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
          />
          <FilterSelect
            label="Reminder"
            value={reminderStage || "all"}
            onChange={(value) => setReminderStage(value === "all" ? "" : value)}
            options={[{ value: "all", label: "All stages" }, ...stages.map((item) => ({ value: item, label: item }))]}
          />
          <FilterSelect
            label="Purpose"
            value={purpose || "all"}
            onChange={(value) => setPurpose(value === "all" ? "" : value)}
            options={[
              { value: "all", label: "All purposes" },
              ...purposes.map((item) => ({ value: item, label: item })),
            ]}
          />
          {clientId && portfolios.length > 0 ? (
            <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-600">
              <p className="text-[11px] font-medium text-slate-500">Portfolios</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {portfolios.map((item) => {
                  const checked = portfolioIds.includes(item.id);
                  return (
                    <label key={item.id} className="flex items-center gap-1.5 text-[12px] text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setPortfolioIds((current) =>
                            checked ? current.filter((id) => id !== item.id) : [...current, item.id],
                          )
                        }
                      />
                      {item.name}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </FilterBar>
      ) : null}

      {error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <KpiGrid className="lg:grid-cols-4">
        {loading && !data
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[96px] animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              />
            ))
          : leaders.map((card) => (
              <div key={card.id}>
                <KpiCard
                  label={card.label}
                  value={card.value}
                  hint={
                    card.row?.subject ||
                    (card.id === "conversion" ? "Not enough deliveries to rank conversion" : "No subject in this selection")
                  }
                  onClick={card.row ? () => setOpenKey(card.row!.subject_key) : undefined}
                />
                <EmailInsightPanel
                  label="AI insight"
                  request={{ ...filters, scope: "kpi", metric: card.metric }}
                />
              </div>
            ))}
      </KpiGrid>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-slate-500 dark:text-slate-400">
          {loading ? "Loading subjects…" : `${formatCount(data?.total ?? 0)} subjects`}
        </p>
        <EmailInsightPanel label="AI insight for this selection" request={{ ...filters, scope: "section" }} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-[920px] w-full text-left text-[12.5px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              {SORTS.map((column) => (
                <th key={column.key} className="px-3 py-2 font-semibold" aria-sort={sort === column.key ? (order === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    {sort === column.key ? (order === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 font-semibold"> </th>
            </tr>
          </thead>
          <tbody>
            {!loading && (data?.rows.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={SORTS.length + 1} className="px-3 py-8 text-center text-slate-500">
                  No email subjects match these filters.
                </td>
              </tr>
            ) : (
              (data?.rows || []).map((row) => (
                <tr key={row.subject_key} className="border-t border-slate-100 align-top dark:border-slate-800">
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="text-left font-medium text-slate-900 hover:text-primary dark:text-slate-50"
                      onClick={() => setOpenKey(row.subject_key)}
                    >
                      {row.subject}
                    </button>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {(row.contexts || []).slice(0, 2).join(" · ") || "No client context"}
                      {row.variations > 1 ? ` · ${row.variations} body versions` : ""}
                      {row.low_sample ? " · Low sample" : ""}
                    </p>
                    <EmailInsightPanel
                      label="AI insight"
                      request={{ ...filters, scope: "subject", subject_key: row.subject_key }}
                    />
                  </td>
                  {SORTS.slice(1).map((column) => (
                    <td key={column.key} className="tabular px-3 py-2.5 text-slate-700 dark:text-slate-200">
                      {cell(row, column.key)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="text-[12px] font-medium text-primary"
                      onClick={() => setOpenKey(row.subject_key)}
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Performance trend</h3>
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              label="Group"
              value={groupBy}
              onChange={(value) => setGroupBy(value as typeof groupBy)}
              options={[
                { value: "overall", label: "Overall" },
                { value: "client", label: "By client" },
                { value: "workflow", label: "By workflow" },
                { value: "stage", label: "By reminder stage" },
              ]}
            />
            <FilterSelect
              label="Period"
              value={trendPeriod}
              onChange={(value) => setTrendPeriod(value === "weekly" ? "weekly" : "daily")}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
              ]}
            />
          </div>
        </div>
        {trendError ? <p className="mb-2 text-[12.5px] text-red-600">{trendError}</p> : null}
        {trendLoading && !trend ? (
          <div className="h-36 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ) : (
          <SubjectTrendChart
            series={(trend?.series || []).map((item) => ({
              label: item.label,
              points: item.points.map((point) => ({ date: point.date, value: point.payments })),
            }))}
            emptyLabel="No completed-payment trend for this selection."
          />
        )}
        {trend && trend.more_groups > 0 ? (
          <p className="mt-1 text-[11px] text-slate-400">
            {trend.more_groups} more groups are omitted. The chart keeps the five with the most completed payments.
          </p>
        ) : null}
      </section>

      <EmailSubjectDetailsModal
        filters={filters}
        subjectKey={openKey}
        onSubjectKey={setOpenKey}
        onClose={() => setOpenKey(null)}
      />
    </Panel>
  );
}
