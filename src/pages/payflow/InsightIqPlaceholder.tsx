import { Link } from "react-router-dom";

/** Placeholder until InsightIQ product screens are built. */
export function InsightIqPlaceholderPage() {
  return (
    <div className="launcher-page">
      <main className="launcher-main narrow" style={{ paddingTop: 80 }}>
        <p className="launcher-kicker">INSIGHTIQ</p>
        <h1>Coming in a later phase</h1>
        <p className="launcher-lead">
          InsightIQ is registered for multi-product access. Operational screens are not available
          yet. Use the product switcher or return to all products.
        </p>
        <Link className="link-btn" to="/products">
          ← Back to products
        </Link>
      </main>
    </div>
  );
}
