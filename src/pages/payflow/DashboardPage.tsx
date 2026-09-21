const FUNNEL = [
  { label: "Sent", value: "5,340", rate: null as string | null },
  { label: "Delivered", value: "5,003", rate: "93.7%" },
  { label: "Opened / Read", value: "3,545", rate: "70.8%" },
  { label: "Clicked", value: "1,460", rate: "41.2%" },
  { label: "Payment Initiated", value: "1,033", rate: "70.8%" },
  { label: "Paid", value: "845", rate: "81.6%" },
];

const OUTCOMES = [
  { label: "AMOUNT RECOVERED", value: "$6.7K" },
  { label: "ACCOUNTS PAID IN FULL", value: "0" },
  { label: "ACTIVE PAYMENT PLANS", value: "2" },
  { label: "PARTIAL PAYMENTS", value: "5" },
  { label: "FAILED PAYMENTS", value: "1" },
];

const ATTENTION = [
  { client: "PayPal", detail: "12 escalated cases awaiting supervisor decision", reviews: 14 },
  { client: "Canadian Tire", detail: "Promise-to-pay follow-ups overdue on 38 accounts", reviews: 9 },
  {
    client: "Northstar Utilities",
    detail: "SMS delivery rate down 8% week over week",
    reviews: 5,
  },
];

const ACTIVITY = [
  { text: "Settlement recommendation created for David Lee (PP-88831)", when: "12 min ago" },
  { text: "Dispute flagged on Priya Nair (CT-22540), routed to human review", when: "48 min ago" },
  { text: "Partial payment of $850 received on PP-10482", when: "2 hours ago" },
  { text: "Early stage reminder batch sent to 412 accounts", when: "3 hours ago" },
  { text: "Installment of $1,100 received on CT-21877", when: "6 hours ago" },
  { text: "Promise-to-pay follow-up SMS sent to 186 accounts", when: "Yesterday" },
];

export function PayFlowDashboardPage() {
  return (
    <div className="pf-page">
      <div className="pf-page-header">
        <div>
          <h1>Operations Dashboard</h1>
          <p>Operations view — illustrative sample data for this phase.</p>
        </div>
      </div>

      <section className="pf-panel">
        <div className="pf-panel-head">
          <div>
            <h2>Communication to Payment Performance</h2>
            <p>Conversion from outreach to completed payment.</p>
          </div>
        </div>
        <div className="pf-funnel">
          {FUNNEL.map((step) => (
            <div className="pf-funnel-card" key={step.label}>
              <div className="pf-funnel-label">{step.label}</div>
              <div className="pf-funnel-value">{step.value}</div>
              {step.rate ? <div className="pf-funnel-rate">{step.rate}</div> : <div className="pf-funnel-rate muted">—</div>}
              <div className="pf-funnel-bar">
                <span style={{ width: step.rate ? step.rate : "100%" }} />
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
              <h2>Clients needing attention</h2>
              <p>Priority follow-ups across portfolios.</p>
            </div>
          </div>
          <div className="pf-list">
            {ATTENTION.map((row) => (
              <div className="pf-list-row" key={row.client}>
                <div>
                  <strong>{row.client}</strong>
                  <p>{row.detail}</p>
                </div>
                <span className="pf-chip">{row.reviews} reviews</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pf-panel">
          <div className="pf-panel-head">
            <div>
              <h2>Recent operational activity</h2>
              <p>Latest events in the collections workspace.</p>
            </div>
          </div>
          <div className="pf-activity">
            {ACTIVITY.map((row) => (
              <div className="pf-activity-row" key={row.text}>
                <span className="pf-activity-dot" />
                <div>
                  <p>{row.text}</p>
                  <span>{row.when}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
