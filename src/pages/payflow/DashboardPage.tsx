const KPIS = [
  { label: "Active Clients", value: "3", hint: null as string | null, tone: "default" as const },
  {
    label: "Accounts Under Collection",
    value: "26,035",
    hint: "+3.1% vs previous period",
    tone: "up" as const,
  },
  {
    label: "Active Collection Cases",
    value: "4,440",
    hint: "+1.6% vs previous period",
    tone: "up" as const,
  },
  {
    label: "Amount Recovered",
    value: "$2.48M",
    hint: "+8.4% vs previous period",
    tone: "up" as const,
    highlight: true,
  },
  {
    label: "Human Reviews Pending",
    value: "5",
    hint: "— 2 high priority · open queue",
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
    badge: "8 reviews",
    tone: "amber" as const,
  },
  {
    name: "Northstar Utilities",
    detail: "SMS delivery rate down 5% week over week",
    badge: "5 reviews",
    tone: "tan" as const,
  },
];

const ACTIVITY = [
  { text: "Settlement recommendation created for David Lee (PP-88831)", when: "12 min ago" },
  { text: "Dispute flagged on Priya Nair (CT-22540), routed to human review", when: "48 min ago" },
  { text: "Partial payment of $1,150 received on PP-10482", when: "2 hours ago" },
  { text: "Early stage reminder batch sent to 412 accounts", when: "3 hours ago" },
  { text: "Installment of $500 received on CT-21877", when: "5 hours ago" },
  { text: "Promise-to-pay follow-up SMS sent to 186 accounts", when: "Yesterday" },
];

export function PayFlowDashboardPage() {
  return (
    <div className="pf-page">
      <div className="pf-page-header">
        <div>
          <h1>Operations Dashboard</h1>
          <p>Operations Admin view · 9 sample accounts loaded</p>
        </div>
      </div>

      <div className="pf-filters">
        <label className="pf-chip-filter">
          <span>Date</span>
          <select defaultValue="today" aria-label="Date">
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="qtd">Quarter to date</option>
          </select>
        </label>
        <label className="pf-chip-filter">
          <span>Client</span>
          <select defaultValue="all" aria-label="Client">
            <option value="all">All Clients</option>
            <option value="paypal">PayPal</option>
            <option value="ct">Canadian Tire</option>
            <option value="northstar">Northstar Utilities</option>
          </select>
        </label>
        <label className="pf-chip-filter">
          <span>Channel</span>
          <select defaultValue="all" aria-label="Channel">
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="voice">Voice</option>
            <option value="letter">Letter</option>
          </select>
        </label>
      </div>

      <div className="pf-kpi-row">
        {KPIS.map((k) => (
          <div className={`pf-kpi-card${k.highlight ? " highlight" : ""}`} key={k.label}>
            <div className="pf-kpi-label">{k.label}</div>
            <div className="pf-kpi-value">{k.value}</div>
            {k.hint ? (
              <div
                className={`pf-kpi-hint${
                  k.tone === "up" ? " up" : k.tone === "muted" ? " muted" : ""
                }`}
              >
                {k.hint}
              </div>
            ) : (
              <div className="pf-kpi-hint spacer" />
            )}
          </div>
        ))}
      </div>

      <section className="pf-panel">
        <div className="pf-panel-head">
          <div>
            <h2>Attention Required</h2>
            <p>Open items that need an operations decision or follow-up.</p>
          </div>
        </div>
        <div className="pf-attention-pills">
          {ATTENTION.map((a) => (
            <button type="button" className={`pf-attention-pill ${a.tone}`} key={a.label}>
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <section className="pf-panel">
        <div className="pf-panel-head">
          <div>
            <h2>Communication to Payment Performance</h2>
            <p>Conversion from outreach to completed payment.</p>
          </div>
        </div>
        <div className="pf-funnel-filters">
          <label className="pf-chip-filter sm">
            <span>Client</span>
            <select defaultValue="all" aria-label="Funnel client">
              <option value="all">All Clients</option>
              <option value="paypal">PayPal</option>
              <option value="ct">Canadian Tire</option>
            </select>
          </label>
          <label className="pf-chip-filter sm">
            <span>Date</span>
            <select defaultValue="today" aria-label="Funnel date">
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
            </select>
          </label>
          <label className="pf-chip-filter sm">
            <span>Channel</span>
            <select defaultValue="all" aria-label="Funnel channel">
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </label>
          <span className="pf-chip-soon">Channel: WhatsApp · soon</span>
          <label className="pf-chip-filter sm">
            <span>Workflow</span>
            <select defaultValue="all" aria-label="Funnel workflow">
              <option value="all">All Workflows</option>
              <option value="early">Early stage</option>
              <option value="ptp">Promise to pay</option>
            </select>
          </label>
        </div>
        <div className="pf-funnel">
          {FUNNEL.map((step) => (
            <div className={`pf-funnel-card${step.paid ? " paid" : ""}`} key={step.label}>
              <div className="pf-funnel-step">
                <span>{step.step}</span> {step.label}
              </div>
              <div className="pf-funnel-value">{step.value}</div>
              {step.rate ? (
                <div className="pf-funnel-meta">
                  <strong>{step.rate}</strong>
                  <span>{step.note}</span>
                  {step.drop ? <em>{step.drop}</em> : null}
                </div>
              ) : (
                <div className="pf-funnel-meta muted">{step.note}</div>
              )}
              <div className="pf-funnel-bar">
                <span style={{ width: `${step.bar}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pf-panel">
        <div className="pf-panel-head">
          <div>
            <h2>Payment Outcomes</h2>
            <p>Outcomes received back from the customer payment experience.</p>
          </div>
        </div>
        <div className="pf-outcome-row">
          {OUTCOMES.map((o) => (
            <div className="pf-outcome-card" key={o.label}>
              <div className="pf-outcome-label">{o.label}</div>
              <div className="pf-outcome-value">{o.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="pf-split">
        <section className="pf-panel">
          <div className="pf-panel-head">
            <div>
              <h2>Clients Needing Attention</h2>
              <p>Clients with open reviews or operational risk signals.</p>
            </div>
          </div>
          <ul className="pf-client-list">
            {CLIENTS_ATTENTION.map((c) => (
              <li key={c.name}>
                <div>
                  <strong>{c.name}</strong>
                  <span>{c.detail}</span>
                </div>
                <em className={`pf-client-badge ${c.tone}`}>{c.badge}</em>
              </li>
            ))}
          </ul>
        </section>

        <section className="pf-panel">
          <div className="pf-panel-head">
            <div>
              <h2>Recent Operational Activity</h2>
              <p>Illustrative operational events.</p>
            </div>
          </div>
          <ul className="pf-activity">
            {ACTIVITY.map((a) => (
              <li key={a.text}>
                <span>{a.text}</span>
                <time>{a.when}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
