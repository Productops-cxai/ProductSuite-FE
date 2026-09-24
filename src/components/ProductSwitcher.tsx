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
    variant === "platform" ? "role-pill role-pill-switch" : "pf-switcher-btn";

  return (
    <div className={`pf-switcher${variant === "platform" ? " platform-variant" : ""}`} ref={ref}>
      <button
        type="button"
        className={triggerClass}
        onClick={toggleOpen}
        aria-expanded={open}
        title="Switch product"
      >
        {variant === "platform" ? (
          <>
            <span className="dot" />
            Platform Super Admin
            <span className="pf-switcher-caret">▾</span>
          </>
        ) : (
          <>
            <span className="pf-switcher-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>{currentProduct?.name || String(current)}</span>
            <span className="pf-switcher-carets" aria-hidden="true">
              <svg viewBox="0 0 12 16" width="10" height="14" fill="currentColor">
                <path d="M6 2 L10 7 H2 Z" />
                <path d="M6 14 L2 9 H10 Z" />
              </svg>
            </span>
          </>
        )}
      </button>

      {open ? (
        <div className="pf-switcher-menu" role="menu">
          <div className="pf-switcher-label">Open product</div>
          {products.length === 0 ? (
            <div className="pf-switcher-empty">No products available</div>
          ) : (
            products.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`pf-switcher-item${
                  !isPlatform && p.code.toUpperCase() === String(current).toUpperCase()
                    ? " active"
                    : ""
                }`}
                disabled={busy === p.code}
                onClick={() => void switchToProduct(p.code)}
              >
                <span>{p.name}</span>
                {!isPlatform && p.code.toUpperCase() === String(current).toUpperCase() ? (
                  <span className="pf-switcher-active">Active</span>
                ) : null}
              </button>
            ))
          )}
          {error ? <div className="pf-switcher-error">{error}</div> : null}
          <div className="pf-switcher-sep" />
          {isSuperAdmin ? (
            <button
              type="button"
              className={`pf-switcher-item${isPlatform ? " active" : ""}`}
              onClick={goPlatform}
            >
              <span>Platform administration</span>
              {isPlatform ? <span className="pf-switcher-check">✓</span> : null}
            </button>
          ) : (
            <button type="button" className="pf-switcher-item" onClick={goLauncher}>
              All products…
            </button>
          )}
          <div className="pf-switcher-sep" />
          <button
            type="button"
            className="pf-switcher-item"
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
