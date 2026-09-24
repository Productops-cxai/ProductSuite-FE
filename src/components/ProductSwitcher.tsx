import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { enterProduct, myProducts } from "../api/platform";
import { useAuth } from "../context/AuthContext";
import type { Product } from "../types";

export type SwitcherCurrent = "platform" | string;

type Props = {
  current: SwitcherCurrent;
  /** Visual style: platform role pill vs product chip */
  variant?: "platform" | "product";
};

function homeForCode(code: string): string {
  const upper = code.toUpperCase();
  if (upper === "PAYFLOW") return "/payflow";
  if (upper === "INSIGHTIQ") return "/insightiq";
  return "/products";
}

export function ProductSwitcher({ current, variant = "product" }: Props) {
  const { isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const isPlatform = current === "platform";

  async function loadProducts() {
    try {
      setProducts(await myProducts());
    } catch {
      setProducts([]);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) void loadProducts();
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
      navigate(homeForCode(code), { replace: true });
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

  const triggerClass =
    variant === "platform"
      ? "inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[0.82rem] font-semibold text-blue-700"
      : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[0.88rem] font-semibold text-slate-900 hover:bg-slate-50";

  const itemClass = (active: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[0.9rem] ${
      active ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-900 hover:bg-slate-50"
    }`;

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
            <span>{currentProduct?.name || String(current)}</span>
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
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
          role="menu"
        >
          <div className="px-2 py-1.5 text-[0.7rem] font-bold tracking-[0.06em] text-slate-500">
            Open product
          </div>
          {products.length === 0 ? (
            <div className="px-2.5 py-2 text-[0.82rem] text-slate-500">No products available</div>
          ) : (
            products.map((p) => {
              const active = !isPlatform && p.code.toUpperCase() === String(current).toUpperCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  className={itemClass(active)}
                  disabled={busy === p.code}
                  onClick={() => void switchToProduct(p.code)}
                >
                  <span>{p.name}</span>
                  {active ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.72rem] font-bold text-emerald-600">
                      Active
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
          {error ? <div className="px-2.5 py-2 text-[0.82rem] text-red-700">{error}</div> : null}
          <div className="mx-1 my-1.5 h-px bg-slate-200" />
          {isSuperAdmin ? (
            <button type="button" className={itemClass(isPlatform)} onClick={goPlatform}>
              <span>Platform administration</span>
              {isPlatform ? <span className="text-blue-600">✓</span> : null}
            </button>
          ) : (
            <button type="button" className={itemClass(false)} onClick={goLauncher}>
              All products…
            </button>
          )}
          <div className="mx-1 my-1.5 h-px bg-slate-200" />
          <button
            type="button"
            className={itemClass(false)}
            onClick={() => {
              setOpen(false);
              void logout();
              navigate("/login", { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
