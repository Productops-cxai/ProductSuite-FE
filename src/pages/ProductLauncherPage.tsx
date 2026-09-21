import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { enterProduct, myProducts } from "../api/platform";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import type { Product } from "../types";

function productHome(code: string): string {
  const upper = code.toUpperCase();
  if (upper === "PAYFLOW") return "/payflow";
  if (upper === "INSIGHTIQ") return "/insightiq";
  return "/products";
}

function isPayFlow(product: Product) {
  return product.code.toUpperCase() === "PAYFLOW";
}

export function ProductLauncherPage() {
  const { user, loading, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!user || isSuperAdmin) return;
    void myProducts()
      .then(setProducts)
      .catch((err) => setError(err instanceof ApiError ? err.detail : "Failed to load products"));
  }, [user, isSuperAdmin]);

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isSuperAdmin) return <Navigate to="/platform" replace />;

  async function onEnter(code: string) {
    setBusy(code);
    setError("");
    try {
      await enterProduct(code);
      navigate(productHome(code), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to enter product");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="launcher-page">
      <header className="launcher-top">
        <div className="launcher-brand">
          <span className="platform-mark-badge">PS</span>
          <strong>Platform Suite</strong>
        </div>
        <div className="launcher-top-actions">
          <span className="launcher-user-chip" title={user.email}>
            {user.full_name}
          </span>
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="launcher-main">
        <p className="launcher-kicker">PLATFORM ACCESS</p>
        <h1>Select a product</h1>
        <p className="launcher-lead">
          You have access to the products below. Roles, client scope and permissions are managed
          inside each product.
        </p>
        <p className="launcher-user">
          Signed in as <strong>{user.full_name}</strong> {user.email}
        </p>

        {error ? <div className="error-banner">{error}</div> : null}

        {products.length === 0 ? (
          <div className="empty-state">No entitled products yet.</div>
        ) : (
          <div className="product-cards">
            {products.map((p) => {
              const payflow = isPayFlow(p);
              return (
                <article className="product-card" key={p.id}>
                  <div className="product-card-head">
                    {payflow ? (
                      <img
                        className="product-card-logo"
                        src="/assets/payflow-logo.png"
                        alt="PayFlow"
                      />
                    ) : (
                      <span className="product-card-fallback">{p.name.charAt(0)}</span>
                    )}
                    <span className="product-available">
                      <span className="dot" />
                      Available
                    </span>
                  </div>
                  <h2>{p.name}</h2>
                  <p>
                    {p.description ||
                      (payflow
                        ? "Collections operations workspace."
                        : "Registered product available for entry.")}
                  </p>
                  <button
                    type="button"
                    className="product-enter-link"
                    disabled={busy === p.code}
                    onClick={() => void onEnter(p.code)}
                  >
                    {busy === p.code ? "Entering…" : `Enter ${p.name} →`}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export function NoAccessPage() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="launcher-page">
      <header className="launcher-top">
        <div className="launcher-brand">
          <span className="platform-mark-badge">PS</span>
          <strong>Platform Suite</strong>
        </div>
        <div className="launcher-top-actions">
          <span className="launcher-user-chip" title={user.email}>
            {user.full_name}
          </span>
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="launcher-main narrow">
        <h1>Access unavailable</h1>
        <p className="launcher-lead">
          Your account is signed in, but no product entitlement is available yet. Contact your
          platform administrator.
        </p>
        <Link to="/login" className="link-btn">
          Back to sign in
        </Link>
      </main>
    </div>
  );
}
