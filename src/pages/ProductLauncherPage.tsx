import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { enterProduct, myProducts } from "../api/platform";
import { PageHeader } from "../components/payflow-ui";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { hasProductShell, productHome } from "../lib/productRouting";
import { ui } from "../lib/ui";
import type { Product } from "../types";

/** Prevent StrictMode remount from POSTing enter twice for the same single-product auto-entry. */
const autoEnterLocks = new Set<string>();

function isPayFlow(product: Product) {
  return product.code.toUpperCase() === "PAYFLOW";
}

function LauncherHeader({
  isSuperAdmin,
  onLogout,
}: {
  isSuperAdmin: boolean;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 shadow-card backdrop-blur-xl lg:px-10">
      <div className="flex items-center gap-3">
        <img src="/assets/payflow-mark.png" alt="" className="h-9 w-auto" />
        <div>
          <strong className="block text-[15px] font-semibold leading-tight text-primary">PayFlow</strong>
          <span className="block text-[10px] font-semibold tracking-[0.1em] text-slate-400">
            AUTOMATE. ENGAGE. RECOVER.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isSuperAdmin ? (
          <Link
            to="/platform"
            className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Platform administration
          </Link>
        ) : null}
        <button type="button" className={`${ui.link} text-[13px]`} onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
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

  // AC1: single entitlement with an in-app shell → enter without selection.
  // Products without a shell (Marvel, NowServe7, etc.) must show the card UI —
  // auto-navigating to /products would loop forever on "Opening your product…".
  useEffect(() => {
    if (loading || !user || products.length !== 1 || autoEntered.current) return;

    const sole = products[0];
    if (!hasProductShell(sole.code)) return;

    const code = sole.code;
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
      if (!hasProductShell(code)) {
        const name = products.find((p) => p.code === code)?.name || code;
        setError(
          `${name} is entitled, but its workspace is not available in this phase yet. Only PayFlow (and InsightIQ placeholder) can be opened from here.`,
        );
        return;
      }
      navigate(productHome(code), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to enter product");
    } finally {
      setBusy("");
    }
  }

  const orgLabel = user.organization_name || "your organization";

  // Only show the spinner while an enter request is in flight — never for
  // "length === 1" alone (that caused an infinite blank screen).
  if (resolvingSingle) {
    return <div className={ui.loading}>Opening your product…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <LauncherHeader isSuperAdmin={isSuperAdmin} onLogout={() => void logout()} />

      <main className="mx-auto w-full max-w-[1080px] px-5 py-12 lg:px-10">
        <p className="text-eyebrow mb-2">Platform access</p>
        <PageHeader
          title="Select a product"
          description={`Products ${orgLabel} is entitled to access. Roles, scope and permissions are managed inside each product.`}
        />
        <p className="-mt-6 mb-8 text-[12.5px] text-slate-500">
          Signed in as <strong className="font-semibold text-slate-800">{user.full_name}</strong> ·{" "}
          {user.email}
        </p>

        {error ? <div className={`${ui.error} mt-4`}>{error}</div> : null}

        {products.length === 0 ? (
          <div className={`${ui.empty} mt-8 rounded-lg border border-dashed border-slate-300`}>
            No entitled products yet.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const payflow = isPayFlow(p);
              const openable = hasProductShell(p.code);
              return (
                <article
                  className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-card"
                  key={p.id}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <img className="size-9 object-contain" src="/assets/payflow-mark.png" alt="" />
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-medium ${
                        openable
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${openable ? "bg-emerald-500" : "bg-slate-400"}`}
                      />
                      {openable ? "Available" : "Later phase"}
                    </span>
                  </div>
                  <h2 className="text-[15px] font-semibold text-slate-900">{p.name}</h2>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
                    {p.description ||
                      (payflow
                        ? "Collections operations: client portfolios, customer accounts, collection cases, adaptive workflows and governed AI decisions."
                        : openable
                          ? "Registered product available for entry."
                          : "Entitled for your organization. Workspace screens ship in a later phase.")}
                  </p>
                  <button
                    type="button"
                    className="mt-4 text-[13px] font-semibold text-primary hover:text-primary-hover disabled:opacity-55"
                    disabled={busy === p.code || !openable}
                    onClick={() => void onEnter(p.code)}
                  >
                    {busy === p.code
                      ? "Entering…"
                      : openable
                        ? `Enter ${p.name} →`
                        : "Not openable yet"}
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
      <LauncherHeader isSuperAdmin={isSuperAdmin} onLogout={() => void logout()} />
      <main className="mx-auto w-full max-w-xl px-5 py-12 lg:px-10">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-slate-900">
          Access unavailable
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
          Your account is signed in, but no product entitlement is available yet. Contact your
          platform administrator.
        </p>
        <div className="mt-6">
          <Button variant="secondary" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </main>
    </div>
  );
}
