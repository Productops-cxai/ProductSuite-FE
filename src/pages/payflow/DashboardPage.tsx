const KPIS = [
  { label: "Active Clients", value: "3", hint: null as string | null, tone: "default" as const },
  {
    label: "Accounts Under Collection",
    value: "26,035",
    hint: "↑ 3.1% vs previous period",
    tone: "up" as const,
  },
  {
    label: "Active Collection Cases",
    value: "4,440",
    hint: "↓ 1.8% vs previous period",
    tone: "down" as const,
  },
  {
    label: "Amount Recovered",
    value: "$2.48M",
    hint: "↑ 8.4% vs previous period",
    tone: "up" as const,
    highlight: true,
  },
  {
    label: "Human Reviews Pending",
    value: "5",
    hint: "→ 2 high priority · open queue",
    tone: "muted" as const,
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
    note: "Start of funnel",
    drop: null as string | null,
    bar: 100,
    paid: false,
  },
  {
    step: "02",
    label: "Delivered",
    value: "5,003",
    rate: "93.7%",
    note: "of previous",
    drop: "−337",
    bar: 93.7,
    paid: false,
  },
  {
    step: "03",
    label: "Opened / Read",
    value: "3,545",
    rate: "70.9%",
    note: "of previous",
    drop: "−1,458",
    bar: 70.9,
    paid: false,
  },
  {
    step: "04",
    label: "Clicked",
    value: "1,460",
    rate: "41.2%",
    note: "of previous",
    drop: "−2,085",
    bar: 41.2,
    paid: false,
  },
  {
    step: "05",
    label: "Payment Initiated",
    value: "1,033",
    rate: "70.8%",
    note: "of previous",
    drop: "−427",
    bar: 70.8,
    paid: false,
  },
  {
    step: "06",
    label: "Paid",
    value: "845",
    rate: "81.8%",
    note: "of previous",
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

const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.84rem] text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300";
const chipSelect =
  "cursor-pointer border-0 bg-transparent p-0 font-semibold text-slate-900 outline-none dark:text-slate-100";
const panel =
  "mb-4 rounded-[14px] border border-slate-200 bg-white px-5 py-[18px] shadow-card dark:border-slate-700 dark:bg-slate-900";
const panelTitle =
  "font-display text-[1.08rem] font-bold tracking-tight text-slate-900 dark:text-slate-50";

const pillTone: Record<string, string> = {
  peach: "bg-orange-50 text-orange-900",
  amber: "bg-amber-50 text-amber-800",
  coral: "bg-rose-50 text-rose-700",
  rose: "bg-pink-50 text-pink-700",
};

const badgeTone: Record<string, string> = {
  rose: "bg-pink-50 text-pink-700",
  amber: "bg-orange-50 text-orange-800",
  tan: "bg-amber-100 text-amber-800",
};

export function PayFlowDashboardPage() {
  return (
    <div className="px-8 pb-12 pt-7">
      <div className="mb-5">
        <h1 className="font-display text-[1.85rem] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
          Operations Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Operations Admin view · 9 sample accounts loaded
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2.5">
        <label className={chip}>
          <span>Date</span>
          <select className={chipSelect} defaultValue="today" aria-label="Date">
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="qtd">Quarter to date</option>
          </select>
        </label>
        <label className={chip}>
          <span>Client</span>
          <select className={chipSelect} defaultValue="all" aria-label="Client">
            <option value="all">All Clients</option>
            <option value="paypal">PayPal</option>
            <option value="ct">Canadian Tire</option>
            <option value="northstar">Northstar Utilities</option>
          </select>
        </label>
        <label className={chip}>
          <span>Channel</span>
          <select className={chipSelect} defaultValue="all" aria-label="Channel">
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="voice">Voice</option>
            <option value="letter">Letter</option>
          </select>
        </label>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {KPIS.map((k) => (
          <div
            className={`rounded-xl border px-4 py-3.5 shadow-card ${
              k.highlight
                ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40"
                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            }`}
            key={k.label}
          >
            <div className="mb-2 text-[0.68rem] font-semibold uppercase leading-snug tracking-[0.04em] text-slate-500 dark:text-slate-400">
              {k.label}
            </div>
            <div
              className={`font-display text-[1.7rem] font-bold leading-none tracking-tight ${
                k.highlight ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-slate-50"
              }`}
            >
              {k.value}
            </div>
            <div
              className={`mt-2 min-h-4 text-xs font-semibold ${
                k.tone === "up" ? "text-emerald-600" : k.tone === "down" ? "text-red-500" : "text-slate-400"
              }`}
            >
              {k.hint || "\u00a0"}
            </div>
          </div>
        ))}
      </div>

      <section className={panel}>
        <div className="mb-3.5">
          <h2 className={panelTitle}>Attention Required</h2>
          <p className="mt-1 text-[0.88rem] text-slate-500 dark:text-slate-400">
            Open items that need an operations decision or follow-up.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {ATTENTION.map((a) => (
            <button
              type="button"
              className={`rounded-full px-3.5 py-2 text-[0.84rem] font-semibold ${pillTone[a.tone]}`}
              key={a.label}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <section className={panel}>
        <div className="mb-3.5">
          <h2 className={panelTitle}>Communication to Payment Performance</h2>
          <p className="mt-1 text-[0.88rem] text-slate-500 dark:text-slate-400">
            Conversion from outreach to completed payment.
          </p>
        </div>
        <div className="mb-3.5 flex flex-wrap gap-2">
          <label className={`${chip} px-2.5 py-1 text-[0.8rem]`}>
            <span>Client</span>
            <select className={chipSelect} defaultValue="all" aria-label="Funnel client">
              <option value="all">All Clients</option>
              <option value="paypal">PayPal</option>
              <option value="ct">Canadian Tire</option>
            </select>
          </label>
          <label className={`${chip} px-2.5 py-1 text-[0.8rem]`}>
            <span>Date</span>
            <select className={chipSelect} defaultValue="today" aria-label="Funnel date">
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
            </select>
          </label>
          <label className={`${chip} px-2.5 py-1 text-[0.8rem]`}>
            <span>Channel</span>
            <select className={chipSelect} defaultValue="all" aria-label="Funnel channel">
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </label>
          <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1 text-[0.8rem] text-slate-400 dark:border-slate-600 dark:bg-slate-950">
            Channel: WhatsApp · soon
          </span>
          <label className={`${chip} px-2.5 py-1 text-[0.8rem]`}>
            <span>Workflow</span>
            <select className={chipSelect} defaultValue="all" aria-label="Funnel workflow">
              <option value="all">All Workflows</option>
              <option value="early">Early Stage Collection</option>
              <option value="reminder">Progressive Reminder</option>
              <option value="ptp">Promise-to-Pay Follow-Up</option>
              <option value="plan">Payment Plan Monitoring</option>
              <option value="escalated">Escalated Collection</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
          {FUNNEL.map((step) => (
            <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-3 dark:border-slate-700 dark:bg-slate-950" key={step.label}>
              <div className="mb-1.5 text-[0.68rem] font-semibold text-slate-500 dark:text-slate-400">
                <span className="mr-1 font-bold text-slate-400">{step.step}</span>
                {step.label}
              </div>
              <div className="font-display text-[1.35rem] font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50">
                {step.value}
              </div>
              {step.rate ? (
                <div className="mt-2 flex items-baseline justify-between gap-1 text-[11px] leading-none text-slate-400">
                  <span>
                    <strong className="font-bold text-emerald-600">{step.rate}</strong>
                    <span className="ml-1">{step.note}</span>
                  </span>
                  {step.drop ? <em className="shrink-0 font-medium not-italic">{step.drop}</em> : null}
                </div>
              ) : (
                <div className="mt-2 text-[11px] leading-none text-slate-400">{step.note}</div>
              )}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span
                  className={`block h-full rounded-full ${
                    step.paid ? "bg-emerald-500" : step.bar >= 100 ? "bg-slate-800 dark:bg-slate-300" : "bg-blue-500"
                  }`}
                  style={{ width: `${step.bar}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={panel}>
        <div className="mb-3.5">
          <h2 className={panelTitle}>Payment Outcomes</h2>
          <p className="mt-1 text-[0.88rem] text-slate-500 dark:text-slate-400">
            Outcomes received back from the customer payment experience.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          {OUTCOMES.map((o) => (
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3.5 dark:border-slate-700 dark:bg-slate-950" key={o.label}>
              <div className="mb-2 text-[0.72rem] font-medium text-slate-500 dark:text-slate-400">{o.label}</div>
              <div className="font-display text-[1.45rem] font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50">
                {o.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section className="rounded-[14px] border border-slate-200 bg-white px-5 py-[18px] shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3.5">
            <h2 className={panelTitle}>Clients Needing Attention</h2>
            <p className="mt-1 text-[0.88rem] text-slate-500 dark:text-slate-400">
              Clients with open reviews or operational risk signals.
            </p>
          </div>
          <ul>
            {CLIENTS_ATTENTION.map((c) => (
              <li key={c.name} className="flex items-start justify-between gap-3 border-t border-slate-100 py-3.5 first:border-t-0 first:pt-0.5 dark:border-slate-800">
                <div>
                  <strong className="mb-1 block text-[0.92rem] text-slate-900 dark:text-slate-100">{c.name}</strong>
                  <span className="block text-[0.84rem] leading-snug text-slate-500 dark:text-slate-400">{c.detail}</span>
                </div>
                <em className={`shrink-0 rounded-full px-2.5 py-1 text-[0.74rem] font-bold not-italic ${badgeTone[c.tone]}`}>
                  {c.badge}
                </em>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[14px] border border-slate-200 bg-white px-5 py-[18px] shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3.5">
            <h2 className={panelTitle}>Recent Operational Activity</h2>
            <p className="mt-1 text-[0.88rem] text-slate-500 dark:text-slate-400">Illustrative operational events.</p>
          </div>
          <ul>
            {ACTIVITY.map((a) => (
              <li key={a.text} className="flex items-start justify-between gap-4 border-t border-slate-100 py-3 first:border-t-0 first:pt-0.5 dark:border-slate-800">
                <span className="text-[0.9rem] leading-snug text-slate-900 dark:text-slate-100">{a.text}</span>
                <time className="shrink-0 whitespace-nowrap text-[0.78rem] text-slate-400">{a.when}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
