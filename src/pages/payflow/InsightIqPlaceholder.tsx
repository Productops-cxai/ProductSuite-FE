import { Link, Navigate } from "react-router-dom";
import { RequireProductAccess } from "../../components/auth/RequireProductAccess";
import { useAuth } from "../../context/AuthContext";

/** Placeholder until InsightIQ product screens are built. */
function InsightIqBody() {
  const { isSuperAdmin } = useAuth();

  return (
    <div className="launcher-page">
      <main className="launcher-main narrow" style={{ paddingTop: 80 }}>
        <p className="launcher-kicker">INSIGHTIQ</p>
        <h1>Coming in a later phase</h1>
        <p className="launcher-lead">
          InsightIQ is registered for multi-product access. Operational screens are not available
          yet. Use the product switcher or return to all products.
        </p>
        <Link className="link-btn" to={isSuperAdmin ? "/platform" : "/products"}>
          ← {isSuperAdmin ? "Back to Platform Admin" : "Back to products"}
        </Link>
      </main>
    </div>
  );
}

export function InsightIqPlaceholderPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <RequireProductAccess productCode="INSIGHTIQ" productLabel="InsightIQ">
      <InsightIqBody />
    </RequireProductAccess>
  );
}
