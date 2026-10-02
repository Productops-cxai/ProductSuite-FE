import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getPayflowDashboard } from "../../api/payflow";
import { PageHeader, Panel, KpiCard, FilterSelect } from "../../components/payflow-ui";
import type { PayflowDashboardResponse } from "../../types";

const pillTone: Record<string, string> = {
  peach:
    "border-orange-200/60 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200",
  amber:
    "border-amber-200/60 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  coral:
    "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200",
  rose: "border-pink-200/60 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-950 dark:text-pink-200",
};

const badgeTone: Record<string, string> = {
  rose: "border-pink-200/60 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-950 dark:text-pink-200",
  amber:
    "border-orange-200/60 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200",
  tan: "border-amber-200/60 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

const emptyDashboard: PayflowDashboardResponse = {
  description: "Loading…",
  filters: {},
  clients: [],
  channels: [],
  workflows: [],
  kpis: [],
  attention: [],
  funnel: [],
  outcomes: [],
  clients_attention: [],
  activity: [],
};

export function PayFlowDashboardPage() {
  const [data, setData] = useState<PayflowDashboardResponse>(emptyDashboard);
  const [filterClients, setFilterClients] = useState<PayflowDashboardResponse["clients"]>([]);
  const [filterChannels, setFilterChannels] = useState<string[]>([]);
  const [filterWorkflows, setFilterWorkflows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("today");
  const [clientId, setClientId] = useState("all");
  const [channel, setChannel] = useState("all");
  const [funnelClientId, setFunnelClientId] = useState("all");
  const [funnelDate, setFunnelDate] = useState("today");
  const [funnelChannel, setFunnelChannel] = useState("all");
  const [funnelWorkflow, setFunnelWorkflow] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const effectiveClient =
      funnelClientId !== "all" ? funnelClientId : clientId !== "all" ? clientId : null;
    const effectiveChannel =
      funnelChannel !== "all" ? funnelChannel : channel !== "all" ? channel : null;
    getPayflowDashboard({
      date_range: funnelDate || dateRange,
      client_id: effectiveClient ? Number(effectiveClient) : undefined,
      channel: effectiveChannel || undefined,
      workflow: funnelWorkflow !== "all" ? funnelWorkflow : undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        // Keep full dropdown catalogs stable even if a filtered response is thin.
        if (res.clients.length) setFilterClients(res.clients);
        if (res.channels.length) setFilterChannels(res.channels);
        if (res.workflows.length) setFilterWorkflows(res.workflows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load dashboard");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange, clientId, channel, funnelClientId, funnelDate, funnelChannel, funnelWorkflow]);

  // Keep top filters and funnel filters loosely synced when top bar changes.
  useEffect(() => {
    setFunnelDate(dateRange);
  }, [dateRange]);
  useEffect(() => {
    setFunnelClientId(clientId);
  }, [clientId]);
  useEffect(() => {
    setFunnelChannel(channel);
  }, [channel]);

  const clientOptions = [
    { value: "all", label: "All Clients" },
    ...filterClients.map((c) => ({ value: String(c.id), label: c.name })),
  ];
  const channelOptions = [
    { value: "all", label: "All Channels" },
    ...(filterChannels.length
      ? filterChannels.map((c) => ({ value: c, label: c }))
      : [
          { value: "Email", label: "Email" },
          { value: "SMS", label: "SMS" },
        ]),
  ];
  const workflowOptions = [
    { value: "all", label: "All Workflows" },
    ...filterWorkflows.map((w) => ({ value: w, label: w })),
  ];

  return (
    <>
      <PageHeader title="Operations Dashboard" description={data.description} />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-x-2 gap-y-2.5">
        <FilterSelect
          label="Date"
          value={dateRange}
          onChange={setDateRange}
          options={[
            { value: "today", label: "Today" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
            { value: "qtd", label: "Quarter to date" },
          ]}
        />
        <FilterSelect
          label="Client"
          value={clientId}
          onChange={setClientId}
          options={clientOptions}
        />
        <FilterSelect
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={channelOptions}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {loading && data.kpis.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[112px] animate-pulse rounded-lg border border-slate-200/80 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
              />
            ))
          : data.kpis.map((k) => (
              <KpiCard
                key={k.id}
                label={k.label}
                value={k.display}
                tone={k.tone === "primary" ? "primary" : "neutral"}
                hint={k.hint || undefined}
                to={k.href || undefined}
              />
            ))}
      </div>

      <Panel
        title="Attention Required"
        description="Open items that need an operations decision or follow-up."
      >
        <div className="flex flex-wrap gap-x-2 gap-y-2.5">
          {data.attention.length === 0 ? (
            <span className="text-[13px] text-slate-500 dark:text-slate-400">
              No open attention items in this filter scope.
            </span>
          ) : (
            data.attention.map((a) =>
              a.href ? (
                <Link
                  key={a.id}
                  to={a.href}
                  className={`rounded-full border px-2.5 py-[3px] text-[11px] font-medium transition hover:-translate-y-px hover:shadow-sm hover:brightness-95 dark:hover:brightness-110 ${pillTone[a.tone] || pillTone.amber}`}
                >
                  {a.label}
                </Link>
              ) : (
                <span
                  key={a.id}
                  className={`rounded-full border px-2.5 py-[3px] text-[11px] font-medium ${pillTone[a.tone] || pillTone.amber}`}
                >
                  {a.label}
                </span>
              ),
            )
          )}
        </div>
      </Panel>

      <Panel
        title="Communication to Payment Performance"
        description="Conversion from outreach to completed payment."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Client"
            value={funnelClientId}
            onChange={setFunnelClientId}
            options={clientOptions}
          />
          <FilterSelect
            label="Date"
            value={funnelDate}
            onChange={setFunnelDate}
            options={[
              { value: "today", label: "Today" },
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
            ]}
          />
          <FilterSelect
            label="Channel"
            value={funnelChannel}
            onChange={setFunnelChannel}
            options={channelOptions}
          />
          <span className="flex h-9 cursor-not-allowed items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 opacity-60 dark:border-slate-600 dark:bg-slate-950">
            <span className="text-[11px] font-medium text-slate-400">Channel</span>
            <span className="text-[13px] font-medium text-slate-400">WhatsApp · soon</span>
          </span>
          <FilterSelect
            label="Workflow"
            value={funnelWorkflow}
            onChange={setFunnelWorkflow}
            options={workflowOptions}
          />
        </div>
        {data.funnel.length === 0 ? (
          <p className="px-1 py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
            No communication activity for this filter scope.
          </p>
        ) : (
          <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700 sm:grid-cols-2 xl:grid-cols-6">
            {data.funnel.map((step) => (
              <div className="bg-white px-4 py-3.5 dark:bg-slate-900" key={step.label}>
                <div className="flex items-center gap-1.5">
                  <span className="tabular text-[10px] font-semibold text-slate-400">{step.step}</span>
                  <span
                    className={`text-[11.5px] font-semibold ${
                      step.paid ? "text-emerald-600" : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                <p className="tabular mt-2 text-[19px] font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50">
                  {step.display}
                </p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span
                    className={`block h-full rounded-full ${
                      step.paid
                        ? "bg-teal-500"
                        : step.bar >= 100
                          ? "bg-slate-800 dark:bg-slate-300"
                          : "bg-primary"
                    }`}
                    style={{ width: `${step.bar}%` }}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  {step.rate ? (
                    <>
                      <span className="tabular text-[11.5px] font-semibold text-primary">{step.rate}</span>
                      <span className="tabular text-[10.5px] text-slate-400">{step.drop}</span>
                    </>
                  ) : (
                    <span className="tabular text-[11.5px] font-semibold text-primary">Start</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Payment Outcomes"
        description="Outcomes received back from the customer payment experience."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.outcomes.map((o) => (
            <KpiCard key={o.id} label={o.label} value={o.display} to={o.href || undefined} />
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Panel
          title="Clients Needing Attention"
          description="Clients with open reviews or operational risk signals."
          className="mb-0"
          bodyClassName="p-0"
        >
          {data.clients_attention.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-slate-500 dark:text-slate-400">
              No clients need attention in this scope.
            </p>
          ) : (
            <ul>
              {data.clients_attention.map((c) => (
                <li
                  key={c.client_id}
                  className="flex items-start justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800"
                >
                  <div>
                    <Link
                      to={c.href || `/payflow/clients/${c.client_id}`}
                      className="mb-1 block text-[13px] font-semibold text-slate-900 hover:text-primary dark:text-slate-100"
                    >
                      {c.name}
                    </Link>
                    <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">
                      {c.detail}
                    </span>
                  </div>
                  <Link
                    to={`/payflow/review?client=${encodeURIComponent(c.name)}`}
                    className={`shrink-0 rounded-full border px-2.5 py-[3px] text-[11px] font-medium ${badgeTone[c.tone] || badgeTone.tan}`}
                  >
                    {c.badge}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent Operational Activity"
          description="Latest in-app notifications for your role."
          className="mb-0"
          bodyClassName="p-0"
        >
          {data.activity.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-slate-500 dark:text-slate-400">
              No recent activity yet.
            </p>
          ) : (
            <ul>
              {data.activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800"
                >
                  {a.href ? (
                    <Link
                      to={a.href}
                      className="text-[13px] leading-snug text-slate-900 hover:text-primary dark:text-slate-100"
                    >
                      {a.text}
                    </Link>
                  ) : (
                    <span className="text-[13px] leading-snug text-slate-900 dark:text-slate-100">
                      {a.text}
                    </span>
                  )}
                  <time className="shrink-0 whitespace-nowrap text-xs text-slate-400">{a.when}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
