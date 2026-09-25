import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { enterProduct, myProducts } from "../api/platform";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { productHome } from "../lib/productRouting";
import { ui } from "../lib/ui";
import type { Product } from "../types";

/** Prevent StrictMode remount from POSTing enter twice for the same single-product auto-entry. */
const autoEnterLocks = new Set<string>();

function isPayFlow(product: Product) {
  return product.code.toUpperCase() === "PAYFLOW";
}

export function ProductLauncherPage() {
  const { user, loading, logout, isSuperAdmin, products: authProducts } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [resolvingSingle, setResolvingSingle] = useState(false);
  const autoEntered = useRef(false);

  useEffect(() => {
    if (!user || loading) return;

    // Prefer session products from /auth/me — avoid a second /me/products when already known.
    if (authProducts.length > 0) {
      setProducts(
        authProducts.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          status: p.status,
          created_at: "",
          updated_at: "",
        })),
      );
      return;
    }

    let cancelled = false;
    void myProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : "Failed to load products");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, authProducts]);

  // AC1: single entitlement → enter the product without requiring selection.
  // Multi-product users (AC2) keep the selection UI.
  useEffect(() => {
    if (loading || !user || products.length !== 1 || autoEntered.current) return;

    const code = products[0].code;
    const lockKey = `${user.id}:${code}`;
    if (autoEnterLocks.has(lockKey)) return;

    autoEntered.current = true;
    autoEnterLocks.add(lockKey);
    setResolvingSingle(true);
    setError("");
    void enterProduct(code)
      .then(() => navigate(productHome(code), { replace: true }))
      .catch((err) => {
        autoEntered.current = false;
        autoEnterLocks.delete(lockKey);
        setError(err instanceof ApiError ? err.detail : "Unable to enter product");
        setResolvingSingle(false);
      });
  }, [loading, user, products, navigate]);

  if (loading) return <div className={ui.loading}>Loading…</div>;
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

  if (resolvingSingle || (products.length === 1 && !error)) {
    return <div className={ui.loading}>Opening your product…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img src="/assets/payflow-mark.png" alt="" className="h-9 w-auto" />
          <div>
            <strong className="block text-[1.05rem] font-bold leading-tight text-primary">PayFlow</strong>
            <span className="block text-[0.62rem] font-semibold tracking-[0.08em] text-slate-400">
              AUTOMATE. ENGAGE. RECOVER.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin ? (
            <Link
              to="/platform"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.82rem] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Platform administration
            </Link>
          ) : null}
          <button type="button" className={ui.link} onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-8 pb-16">
        <p className="mb-2 text-[0.72rem] font-bold tracking-[0.12em] text-slate-400">PLATFORM ACCESS</p>
        <h1 className="font-display text-[2rem] font-bold tracking-tight text-slate-900">Select a product</h1>
        <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-slate-500">
          Products {orgLabel} is entitled to access. Roles, scope and permissions are managed inside
          each product.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Signed in as <strong className="text-slate-800">{user.full_name}</strong> · {user.email}
        </p>

        {error ? <div className={`${ui.error} mt-4`}>{error}</div> : null}

        {products.length === 0 ? (
          <div className={ui.empty}>No entitled products yet.</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {products.map((p) => {
              const payflow = isPayFlow(p);
              return (
                <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-card" key={p.id}>
                  <div className="mb-4 flex items-start justify-between">
                    <img
                      className="size-9 object-contain"
                      src="/assets/payflow-mark.png"
                      alt=""
                    />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.75rem] font-semibold text-emerald-700">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Available
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-bold">{p.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {p.description ||
                      (payflow
                        ? "Collections operations: client portfolios, customer accounts, collection cases, adaptive workflows and governed AI decisions."
                        : "Registered product available for entry.")}
                  </p>
                  <button
                    type="button"
                    className="mt-4 text-sm font-semibold text-primary hover:text-primary-hover disabled:opacity-55"
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
  if (loading) return <div className={ui.loading}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img src="/assets/payflow-mark.png" alt="" className="h-9 w-auto" />
          <div>
            <strong className="block text-[1.05rem] font-bold leading-tight text-primary">PayFlow</strong>
            <span className="block text-[0.62rem] font-semibold tracking-[0.08em] text-slate-400">
              AUTOMATE. ENGAGE. RECOVER.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin ? (
            <Link
              to="/platform"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.82rem] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Platform administration
            </Link>
          ) : null}
          <button type="button" className={ui.link} onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-8 pb-16">
        <h1 className="font-display text-[2rem] font-bold tracking-tight">Access unavailable</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-500">
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
