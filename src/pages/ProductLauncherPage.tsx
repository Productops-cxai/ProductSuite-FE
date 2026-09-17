import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { enterProduct, myProducts } from "../api/platform";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import type { Product } from "../types";

export function ProductLauncherPage() {
  const { user, loading, logout, isSuperAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
    setMessage("");
    try {
      const res = await enterProduct(code);
      setMessage(`${res.message} — ${res.product.name} (${res.product.code})`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to enter product");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="launcher">
      <div className="launcher-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1>Your products</h1>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              Signed in as {user.full_name} ({user.email})
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>

        {error ? <div className="error-banner" style={{ marginTop: 16 }}>{error}</div> : null}
        {message ? <div className="success-banner" style={{ marginTop: 16 }}>{message}</div> : null}

        {products.length === 0 ? (
          <div className="empty-state">No entitled products yet.</div>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <div className="product-tile" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{p.code}</div>
                </div>
                <Button size="sm" disabled={busy === p.code} onClick={() => void onEnter(p.code)}>
                  {busy === p.code ? "Entering…" : "Enter"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function NoAccessPage() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="launcher">
      <div className="launcher-card">
        <h1>Access unavailable</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Your account is signed in, but no product entitlement is available yet. Contact your
          platform administrator.
        </p>
        <Button variant="secondary" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
