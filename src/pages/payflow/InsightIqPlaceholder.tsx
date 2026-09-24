import { Link, Navigate } from "react-router-dom";
import { RequireProductAccess } from "../../components/auth/RequireProductAccess";
import { useAuth } from "../../context/AuthContext";
import { ui } from "../../lib/ui";

/** Placeholder until InsightIQ product screens are built. */
function InsightIqBody() {
  const { isSuperAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      <main className="mx-auto w-full max-w-xl px-8 pb-16 pt-20">
        <p className="mb-2 text-[0.72rem] font-bold tracking-[0.12em] text-slate-400">INSIGHTIQ</p>
        <h1 className="font-display text-[2rem] font-bold tracking-tight">Coming in a later phase</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-500">
          InsightIQ is registered for multi-product access. Operational screens are not available
          yet. Use the product switcher or return to all products.
        </p>
        <Link className={`${ui.link} mt-4 inline-block`} to={isSuperAdmin ? "/platform" : "/products"}>
          ← {isSuperAdmin ? "Back to Platform Admin" : "Back to products"}
        </Link>
      </main>
    </div>
  );
}

export function InsightIqPlaceholderPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className={ui.loading}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <RequireProductAccess productCode="INSIGHTIQ" productLabel="InsightIQ">
      <InsightIqBody />
    </RequireProductAccess>
  );
}
