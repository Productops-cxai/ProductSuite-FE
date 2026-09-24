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
    if (!user) return;
    void myProducts()
      .then(setProducts)
      .catch((err) => setError(err instanceof ApiError ? err.detail : "Failed to load products"));
  }, [user]);

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

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

  const orgLabel = user.organization_name || "your organization";

  return (
    <div className="launcher-page">
      <header className="launcher-top">
        <div className="launcher-brand wordmark">
          <img src="/assets/payflow-mark.png" alt="" className="launcher-mark" />
          <div>
            <strong>PayFlow</strong>
            <span>AUTOMATE. ENGAGE. RECOVER.</span>
          </div>
        </div>
        <div className="launcher-top-actions">
          {isSuperAdmin ? (
            <Link to="/platform" className="btn btn-secondary btn-sm">
              Platform administration
            </Link>
          ) : null}
          <button type="button" className="link-btn launcher-signout" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="launcher-main">
        <p className="launcher-kicker">PLATFORM ACCESS</p>
        <h1>Select a product</h1>
        <p className="launcher-lead">
          Products {orgLabel} is entitled to access. Roles, scope and permissions are managed inside
          each product.
        </p>
        <p className="launcher-user">
          Signed in as <strong>{user.full_name}</strong> · {user.email}
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
                    <img
                      className="product-card-mark"
                      src="/assets/payflow-mark.png"
                      alt=""
                    />
                    <span className="product-available">
                      <span className="dot" />
                      Available
                    </span>
                  </div>
                  <h2>{p.name}</h2>
                  <p>
                    {p.description ||
                      (payflow
                        ? "Collections operations: client portfolios, customer accounts, collection cases, adaptive workflows and governed AI decisions."
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
  const { user, loading, logout, isSuperAdmin } = useAuth();
  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="launcher-page">
      <header className="launcher-top">
        <div className="launcher-brand wordmark">
          <img src="/assets/payflow-mark.png" alt="" className="launcher-mark" />
          <div>
            <strong>PayFlow</strong>
            <span>AUTOMATE. ENGAGE. RECOVER.</span>
          </div>
        </div>
        <div className="launcher-top-actions">
          {isSuperAdmin ? (
            <Link to="/platform" className="btn btn-secondary btn-sm">
              Platform administration
            </Link>
          ) : null}
          <button type="button" className="link-btn launcher-signout" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="launcher-main narrow">
        <h1>Access unavailable</h1>
        <p className="launcher-lead">
          Your account is signed in, but no product entitlement is available yet. Contact your
          platform administrator.
        </p>
        <Button variant="secondary" onClick={() => void logout()}>
          Sign out
        </Button>
      </main>
    </div>
  );
}
