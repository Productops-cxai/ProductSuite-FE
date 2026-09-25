import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { enterProduct, myProducts } from "../api/platform";
import { useAuth } from "../context/AuthContext";
import { productHome } from "../lib/productRouting";
import type { Product, ProductBrief } from "../types";

export type SwitcherCurrent = "platform" | string;

type Props = {
  current: SwitcherCurrent;
  /** Visual style: platform role pill vs product chip */
  variant?: "platform" | "product";
};

function asProducts(list: ProductBrief[]): Product[] {
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    description: p.description,
    status: p.status,
    created_at: "",
    updated_at: "",
  }));
}

export function ProductSwitcher({ current, variant = "product" }: Props) {
  const { isSuperAdmin, logout, products: authProducts } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(() => asProducts(authProducts));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isPlatform = current === "platform";

  // Keep labels in sync with session products — no extra /me/products on mount.
  useEffect(() => {
    setProducts(asProducts(authProducts));
  }, [authProducts]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function refreshProducts() {
    if (loadingList) return;
    setLoadingList(true);
    try {
      setProducts(await myProducts());
    } catch {
      /* keep current list */
    } finally {
      setLoadingList(false);
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    // Refresh only when opening, so switch sees current entitlements (one call).
    if (next) void refreshProducts();
  }

  const currentProduct = !isPlatform
    ? products.find((p) => p.code.toUpperCase() === String(current).toUpperCase())
    : undefined;

  async function switchToProduct(code: string) {
    if (!isPlatform && code.toUpperCase() === String(current).toUpperCase()) {
      setOpen(false);
      return;
    }
    setBusy(code);
    setError("");
    try {
      await enterProduct(code);
      navigate(productHome(code), { replace: true });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to open product");
    } finally {
      setBusy("");
    }
  }

  function goPlatform() {
    setOpen(false);
    navigate("/platform", { replace: true });
  }

  function goLauncher() {
    setOpen(false);
    navigate("/products", { replace: true });
  }

  async function onSignOut() {
    setSigningOut(true);
    setOpen(false);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
      setSigningOut(false);
    }
  }

  const triggerClass =
    variant === "platform"
      ? "inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[0.82rem] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
      : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[0.88rem] font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";

  const rowClass =
    "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[0.92rem] text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800";

  const otherProducts = products.filter(
    (p) => isPlatform || p.code.toUpperCase() !== String(current).toUpperCase(),
  );
  const currentLabel =
    currentProduct?.name ||
    (!isPlatform
      ? authProducts.find((p) => p.code.toUpperCase() === String(current).toUpperCase())?.name
      : undefined) ||
    (isPlatform ? "Platform" : String(current));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={triggerClass}
        onClick={toggleOpen}
        aria-expanded={open}
        title="Switch product"
      >
        {variant === "platform" ? (
          <>
            <span className="size-1.5 rounded-full bg-primary" />
            Platform Super Admin
            <span className="text-blue-500">▾</span>
          </>
        ) : (
          <>
            <span className="grid size-3.5 grid-cols-2 gap-0.5" aria-hidden="true">
              <span className="rounded-[1.5px] bg-slate-500" />
              <span className="rounded-[1.5px] bg-slate-500" />
              <span className="rounded-[1.5px] bg-slate-500" />
              <span className="rounded-[1.5px] bg-slate-500" />
            </span>
            <span>{currentLabel}</span>
            <span className="ml-0.5 text-slate-400" aria-hidden="true">
              <svg viewBox="0 0 12 16" width="10" height="14" fill="currentColor">
                <path d="M6 2 L10 7 H2 Z" />
                <path d="M6 14 L2 9 H10 Z" />
              </svg>
            </span>
          </>
        )}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[280px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
          role="menu"
        >
          <div className="px-4 pb-1 pt-2 text-[0.68rem] font-semibold tracking-[0.06em] text-slate-400">
            CURRENT PRODUCT
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2 text-[0.95rem]">
            <span className="font-medium text-slate-900 dark:text-slate-100">{currentLabel}</span>
            {!isPlatform ? <span className="shrink-0 text-sm font-medium text-primary">Active</span> : null}
          </div>

          <div className="mx-3 my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
          <div className="px-4 pb-1 pt-1.5 text-[0.68rem] font-semibold tracking-[0.06em] text-slate-400">
            OTHER PRODUCTS
          </div>
          {otherProducts.length === 0 ? (
            <div className="px-4 py-2 text-[0.88rem] text-slate-400">No other products</div>
          ) : (
            otherProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                role="menuitem"
                className={rowClass}
                disabled={busy === p.code}
                onClick={() => void switchToProduct(p.code)}
              >
                <span>{p.name}</span>
              </button>
            ))
          )}
          {error ? <div className="px-4 py-2 text-[0.82rem] text-red-700 dark:text-red-400">{error}</div> : null}

          <div className="mx-3 my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
          <button type="button" role="menuitem" className={rowClass} onClick={goLauncher}>
            Product selection
          </button>
          {isSuperAdmin && !isPlatform ? (
            <button type="button" role="menuitem" className={rowClass} onClick={goPlatform}>
              Platform administration
            </button>
          ) : null}

          {!isPlatform ? (
            <>
              <div className="mx-3 my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
              <div className="px-4 py-2 text-[0.82rem] text-slate-400">
                {currentLabel} Operations (internal)
              </div>
            </>
          ) : null}

          {isPlatform ? (
            <>
              <div className="mx-3 my-1.5 h-px bg-slate-100 dark:bg-slate-800" />
              <button
                type="button"
                role="menuitem"
                className={`${rowClass} text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10`}
                disabled={signingOut}
                onClick={() => void onSignOut()}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
