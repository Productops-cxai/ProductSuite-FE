import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getPayflowDashboard } from "../../api/payflow";
import { PageHeader, Panel, KpiCard, KpiGrid, FilterBar, FilterSelect } from "../../components/payflow-ui";
import { usePayFlowAccess } from "../../context/PayFlowAccessContext";
import { cn } from "../../lib/utils";
import type { PayflowDashboardFunnelStep, PayflowDashboardResponse } from "../../types";

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function funnelValue(funnel: PayflowDashboardFunnelStep[], label: string) {
  return funnel.find((s) => s.label === label)?.value ?? 0;
}

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
  const { isOperationsAdmin, access, hasPermission } = usePayFlowAccess();
  const assignedCount = access?.client_ids?.length ?? 0;
  const showAssignHint = !isOperationsAdmin && assignedCount === 0;
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
  const [funnelExpanded, setFunnelExpanded] = useState<string | null>(null);

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

  useEffect(() => {
    setFunnelExpanded(null);
  }, [funnelClientId, funnelDate, funnelChannel, funnelWorkflow]);

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

      {showAssignHint ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          Your role permissions control which pages you can open (sidebar). You are not assigned to
          any client yet, so operational lists stay empty until an Operations Admin assigns you on{" "}
          {hasPermission("view_client") ? (
            <Link to="/payflow/clients" className="font-semibold underline">
              Clients → edit → Supervisors
            </Link>
          ) : (
            <span className="font-semibold">Clients → edit → Supervisors</span>
          )}
          .
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <FilterBar className="mb-5">
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
      </FilterBar>

      <KpiGrid className="mb-6 lg:grid-cols-5">
        {loading && data.kpis.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-lg border border-slate-200/80 bg-slate-100 sm:min-h-[96px] dark:border-slate-700 dark:bg-slate-900"
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
      </KpiGrid>

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
        description="Conversion from outreach to completed payment, with address validity and inbox placement"
      >
        <FilterBar className="mb-3">
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
          <span className="flex h-9 w-full min-w-0 cursor-not-allowed items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 opacity-60 dark:border-slate-600 dark:bg-slate-950 xl:w-auto">
            <span className="shrink-0 text-[11px] font-medium text-slate-400">Channel</span>
            <span className="truncate text-[13px] font-medium text-slate-400">WhatsApp · soon</span>
          </span>
          <FilterSelect
            label="Workflow"
            value={funnelWorkflow}
            onChange={setFunnelWorkflow}
            options={workflowOptions}
          />
        </FilterBar>
        {data.funnel.length === 0 ? (
          <p className="px-1 py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
            No communication activity for this filter scope.
          </p>
        ) : (
          (() => {
            const bd = data.funnel_breakdown;
            const sent = bd?.sent ?? funnelValue(data.funnel, "Sent");
            const delivered = bd?.delivered ?? funnelValue(data.funnel, "Delivered");
            const valid = bd?.valid_addresses ?? sent;
            const invalid = bd?.invalid_addresses ?? 0;
            const totalRecords = valid + invalid;
            const showPlacement =
              (bd?.placement_available ?? true) &&
              (funnelChannel === "all" || funnelChannel.toLowerCase() === "email");
            const placement = bd?.placement?.length
              ? bd.placement
              : [
                  { label: "Inbox", volume: delivered },
                  { label: "Spam", volume: 0 },
                  { label: "Promotions", volume: 0 },
                ];

            const main = [
              {
                key: "records",
                label: "Total Records",
                volume: totalRecords,
                sub: "records received",
                href: null as string | null,
                paid: false,
              },
              ...data.funnel
                .filter((s) => s.label !== "Sent")
                .map((s) => ({
                  key: s.label,
                  label: s.label,
                  volume: s.value,
                  sub: "",
                  href: s.href || null,
                  paid: Boolean(s.paid),
                })),
            ];
            const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "0%");
            const breakdown =
              funnelExpanded === "records"
                ? [
                    {
                      label: "Valid Addresses",
                      volume: valid,
                      of: totalRecords,
                      tone: "bg-primary",
                    },
                    {
                      label: "Invalid Addresses",
                      volume: invalid,
                      of: totalRecords,
                      tone: "bg-amber-500",
                    },
                    {
                      label: "Sent",
                      volume: sent,
                      of: valid || 1,
                      tone: "bg-slate-800 dark:bg-slate-300",
                    },
                  ]
                : funnelExpanded === "Delivered" && showPlacement
                  ? placement.map((p) => ({
                      label: p.label,
                      volume: p.volume,
                      of: delivered,
                      tone:
                        p.label === "Inbox"
                          ? "bg-teal-500"
                          : p.label === "Spam"
                            ? "bg-amber-500"
                            : "bg-primary",
                    }))
                  : null;

            return (
              <>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700 sm:grid-cols-3 lg:grid-cols-6">
                  {main.map((m, i) => {
                    const expandable =
                      m.key === "records" || (m.key === "Delivered" && showPlacement);
                    const isOpen = funnelExpanded === m.key;
                    const prev = i > 0 ? main[i - 1]!.volume : 0;
                    const barBase = totalRecords || main[0]?.volume || 1;
                    const body = (
                      <>
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={cn(
                              "truncate text-[11px] font-semibold sm:text-[11.5px]",
                              m.paid
                                ? "text-emerald-600"
                                : "text-slate-800 dark:text-slate-100",
                            )}
                          >
                            {m.label}
                          </span>
                          {expandable ? (
                            <span className="shrink-0 text-[10.5px] text-slate-400">
                              {isOpen ? "▴" : "▾"}
                            </span>
                          ) : null}
                        </div>
                        <p className="tabular mt-1.5 text-[17px] font-bold leading-none tracking-tight text-slate-900 sm:mt-2 sm:text-[19px] dark:text-slate-50">
                          {formatNumber(m.volume)}
                        </p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 sm:mt-2.5 sm:h-1.5 dark:bg-slate-800">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              m.paid
                                ? "bg-teal-500"
                                : i === 0
                                  ? "bg-slate-800 dark:bg-slate-300"
                                  : "bg-primary",
                            )}
                            style={{
                              width: `${Math.max(5, (m.volume / barBase) * 100)}%`,
                            }}
                          />
                        </div>
                        <p className="tabular mt-1.5 text-[10px] text-slate-400 sm:mt-2 sm:text-[10.5px]">
                          {i === 0 ? m.sub : `${pct(m.volume, prev)} of previous`}
                        </p>
                      </>
                    );
                    const cls = cn(
                      "block bg-white px-3 py-2.5 text-left transition hover:bg-slate-50 sm:px-4 sm:py-3.5 dark:bg-slate-900 dark:hover:bg-slate-800",
                      isOpen && "bg-slate-50 ring-1 ring-inset ring-primary/40 dark:bg-slate-800",
                    );
                    if (expandable) {
                      return (
                        <button
                          key={m.key}
                          type="button"
                          className={cls}
                          onClick={() => setFunnelExpanded(isOpen ? null : m.key)}
                        >
                          {body}
                        </button>
                      );
                    }
                    return m.href ? (
                      <Link key={m.key} to={m.href} className={cls}>
                        {body}
                      </Link>
                    ) : (
                      <div key={m.key} className={cls}>
                        {body}
                      </div>
                    );
                  })}
                </div>
                {breakdown ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/60">
                    <p className="mb-2.5 text-[11.5px] font-semibold text-slate-800 dark:text-slate-100">
                      {funnelExpanded === "records"
                        ? "Total Records breakdown"
                        : "Delivered where (email)"}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {breakdown.map((b) => (
                        <div
                          key={b.label}
                          className="rounded-md border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                              {b.label}
                            </span>
                            <span className="tabular text-[10.5px] text-slate-400">
                              {pct(b.volume, b.of)}
                            </span>
                          </div>
                          <p className="tabular mt-1 text-[16px] font-bold text-slate-900 dark:text-slate-50">
                            {formatNumber(b.volume)}
                          </p>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={cn("h-full rounded-full", b.tone)}
                              style={{
                                width: `${b.of ? (b.volume / b.of) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {funnelExpanded === "Delivered" ? (
                      <p className="mt-2 text-[10.5px] text-slate-400">
                        Placement uses open/click signals when available; otherwise delivered volume
                        is shown under Inbox.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            );
          })()
        )}
      </Panel>

      <Panel
        title="Payment Outcomes"
        description="Outcomes received back from the customer payment experience."
      >
        <KpiGrid className="mb-0 lg:grid-cols-5">
          {data.outcomes.map((o) => (
            <KpiCard key={o.id} label={o.label} value={o.display} to={o.href || undefined} />
          ))}
        </KpiGrid>
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
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-[3px] text-[11px] font-medium ${badgeTone[c.tone] || badgeTone.tan}`}
                  >
                    {c.badge}
                  </span>
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
