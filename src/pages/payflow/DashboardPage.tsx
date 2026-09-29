import { PageHeader, Panel, KpiCard, FilterSelect } from "../../components/payflow-ui";

const KPIS = [
  { label: "Active Clients", value: "3", hint: null as string | null, tone: "default" as const },
  {
    label: "Accounts Under Collection",
    value: "26,035",
    hint: "3.1% vs previous period",
    direction: "up" as const,
  },
  {
    label: "Active Collection Cases",
    value: "4,440",
    hint: "1.8% vs previous period",
    direction: "down" as const,
  },
  {
    label: "Amount Recovered",
    value: "$2.48M",
    hint: "8.4% vs previous period",
    direction: "up" as const,
    highlight: true,
  },
  {
    label: "Human Reviews Pending",
    value: "5",
    hint: "2 high priority · open queue",
    direction: "flat" as const,
  },
];

const ATTENTION = [
  { label: "Human Reviews Pending · 5", tone: "peach" as const },
  { label: "Failed Communications · 1", tone: "amber" as const },
  { label: "Failed Payments · 1", tone: "coral" as const },
  { label: "Integration Issues · 1", tone: "rose" as const },
];

const FUNNEL = [
  {
    step: "01",
    label: "Sent",
    value: "5,340",
    rate: null as string | null,
    drop: null as string | null,
    bar: 100,
    paid: false,
  },
  {
    step: "02",
    label: "Delivered",
    value: "5,003",
    rate: "93.7%",
    drop: "−337",
    bar: 93.7,
    paid: false,
  },
  {
    step: "03",
    label: "Opened / Read",
    value: "3,545",
    rate: "70.9%",
    drop: "−1,458",
    bar: 70.9,
    paid: false,
  },
  {
    step: "04",
    label: "Clicked",
    value: "1,460",
    rate: "41.2%",
    drop: "−2,085",
    bar: 41.2,
    paid: false,
  },
  {
    step: "05",
    label: "Payment Initiated",
    value: "1,033",
    rate: "70.8%",
    drop: "−427",
    bar: 70.8,
    paid: false,
  },
  {
    step: "06",
    label: "Paid",
    value: "845",
    rate: "81.8%",
    drop: "−188",
    bar: 81.8,
    paid: true,
  },
];

const OUTCOMES = [
  { label: "Amount Recovered", value: "$6.7K" },
  { label: "Accounts Paid in Full", value: "0" },
  { label: "Active Payment Plans", value: "2" },
  { label: "Partial Payments", value: "5" },
  { label: "Failed Payments", value: "1" },
];

const CLIENTS_ATTENTION = [
  {
    name: "PayPal",
    detail: "12 escalated cases awaiting supervisor decision",
    badge: "14 reviews",
    tone: "rose" as const,
  },
  {
    name: "Canadian Tire",
    detail: "Promise-to-pay follow-ups overdue on 38 accounts",
    badge: "9 reviews",
    tone: "amber" as const,
  },
  {
    name: "Northstar Utilities",
    detail: "SMS delivery rate down 6% week over week",
    badge: "5 reviews",
    tone: "tan" as const,
  },
];

const ACTIVITY = [
  { text: "Settlement recommendation created for David Lee (PP-88831)", when: "12 min ago" },
  { text: "Dispute flagged on Priya Nair (CT-22540), routed to human review", when: "48 min ago" },
  { text: "Partial payment of $1,150 received on PP-10482", when: "2 hours ago" },
  { text: "Early stage reminder batch sent to 412 accounts", when: "3 hours ago" },
  { text: "Installment of $1,100 received on CT-21877", when: "5 hours ago" },
  { text: "Promise-to-pay follow-up SMS sent to 186 accounts", when: "Yesterday" },
];

const pillTone: Record<string, string> = {
  peach: "border-orange-200/60 bg-orange-50 text-orange-900",
  amber: "border-amber-200/60 bg-amber-50 text-amber-800",
  coral: "border-rose-200/60 bg-rose-50 text-rose-700",
  rose: "border-pink-200/60 bg-pink-50 text-pink-700",
};

const badgeTone: Record<string, string> = {
  rose: "border-pink-200/60 bg-pink-50 text-pink-700",
  amber: "border-orange-200/60 bg-orange-50 text-orange-800",
  tan: "border-amber-200/60 bg-amber-100 text-amber-800",
};

export function PayFlowDashboardPage() {
  return (
    <div className="px-5 py-7 lg:px-10 lg:py-9">
      <PageHeader
        title="Operations Dashboard"
        description="Operations Admin view · 9 sample accounts loaded"
      />

      <div className="mb-5 flex flex-wrap gap-x-2 gap-y-2.5">
        <FilterSelect
          label="Date"
          defaultValue="today"
          options={[
            { value: "today", label: "Today" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
            { value: "qtd", label: "Quarter to date" },
          ]}
        />
        <FilterSelect
          label="Client"
          defaultValue="all"
          options={[
            { value: "all", label: "All Clients" },
            { value: "paypal", label: "PayPal" },
            { value: "ct", label: "Canadian Tire" },
            { value: "northstar", label: "Northstar Utilities" },
          ]}
        />
        <FilterSelect
          label="Channel"
          defaultValue="all"
          options={[
            { value: "all", label: "All Channels" },
            { value: "email", label: "Email" },
            { value: "sms", label: "SMS" },
            { value: "voice", label: "Voice" },
            { value: "letter", label: "Letter" },
          ]}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            tone={k.highlight ? "primary" : "neutral"}
            trend={
              k.direction && k.hint
                ? { direction: k.direction, text: k.hint }
                : undefined
            }
            hint={!k.direction ? k.hint || undefined : undefined}
          />
        ))}
      </div>

      <Panel
        title="Attention Required"
        description="Open items that need an operations decision or follow-up."
      >
        <div className="flex flex-wrap gap-x-2 gap-y-2.5">
          {ATTENTION.map((a) => (
            <button
              type="button"
              className={`rounded-full border px-2.5 py-[3px] text-[11px] font-medium ${pillTone[a.tone]}`}
              key={a.label}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="Communication to Payment Performance"
        description="Conversion from outreach to completed payment."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Client"
            defaultValue="all"
            options={[
              { value: "all", label: "All Clients" },
              { value: "paypal", label: "PayPal" },
              { value: "ct", label: "Canadian Tire" },
            ]}
          />
          <FilterSelect
            label="Date"
            defaultValue="today"
            options={[
              { value: "today", label: "Today" },
              { value: "7d", label: "Last 7 days" },
            ]}
          />
          <FilterSelect
            label="Channel"
            defaultValue="all"
            options={[
              { value: "all", label: "All Channels" },
              { value: "email", label: "Email" },
              { value: "sms", label: "SMS" },
            ]}
          />
          <span className="flex h-9 cursor-not-allowed items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 opacity-60 dark:border-slate-600 dark:bg-slate-950">
            <span className="text-[11px] font-medium text-slate-400">Channel</span>
            <span className="text-[13px] font-medium text-slate-400">WhatsApp · soon</span>
          </span>
          <FilterSelect
            label="Workflow"
            defaultValue="all"
            options={[
              { value: "all", label: "All Workflows" },
              { value: "early", label: "Early Stage Collection" },
              { value: "reminder", label: "Progressive Reminder" },
              { value: "ptp", label: "Promise-to-Pay Follow-Up" },
              { value: "plan", label: "Payment Plan Monitoring" },
              { value: "escalated", label: "Escalated Collection" },
            ]}
          />
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700 sm:grid-cols-2 xl:grid-cols-6">
          {FUNNEL.map((step) => (
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
                {step.value}
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
      </Panel>

      <Panel
        title="Payment Outcomes"
        description="Outcomes received back from the customer payment experience."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {OUTCOMES.map((o) => (
            <KpiCard key={o.label} label={o.label} value={o.value} />
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
          <ul>
            {CLIENTS_ATTENTION.map((c) => (
              <li
                key={c.name}
                className="flex items-start justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800"
              >
                <div>
                  <strong className="mb-1 block text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {c.name}
                  </strong>
                  <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">
                    {c.detail}
                  </span>
                </div>
                <em
                  className={`shrink-0 rounded-full border px-2.5 py-[3px] text-[11px] font-medium not-italic ${badgeTone[c.tone]}`}
                >
                  {c.badge}
                </em>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Recent Operational Activity"
          description="Illustrative operational events."
          className="mb-0"
          bodyClassName="p-0"
        >
          <ul>
            {ACTIVITY.map((a) => (
              <li
                key={a.text}
                className="flex items-start justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800"
              >
                <span className="text-[13px] leading-snug text-slate-900 dark:text-slate-100">{a.text}</span>
                <time className="shrink-0 whitespace-nowrap text-xs text-slate-400">{a.when}</time>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
