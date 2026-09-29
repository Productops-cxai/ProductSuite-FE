import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPayflowAccessContext, getPayflowMenus } from "../api/payflow";
import type { MenuSection, PayflowAccessContext } from "../types";

interface PayFlowContextValue {
  loading: boolean;
  error: string | null;
  access: PayflowAccessContext | null;
  menus: MenuSection[];
  isOperationsAdmin: boolean;
  roleLabel: string;
  refresh: () => void;
}

const PayFlowContext = createContext<PayFlowContextValue | null>(null);

export function PayFlowAccessProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<PayflowAccessContext | null>(null);
  const [menus, setMenus] = useState<MenuSection[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getPayflowAccessContext(), getPayflowMenus()])
      .then(([ctx, menuRes]) => {
        if (cancelled) return;
        setAccess(ctx);
        setMenus(menuRes.sections || []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Failed to load PayFlow access context";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const value = useMemo<PayFlowContextValue>(
    () => ({
      loading,
      error,
      access,
      menus,
      isOperationsAdmin: Boolean(access?.is_operations_admin),
      roleLabel: access?.role?.name || "PayFlow User",
      refresh: () => setTick((t) => t + 1),
    }),
    [loading, error, access, menus],
  );

  return <PayFlowContext.Provider value={value}>{children}</PayFlowContext.Provider>;
}

export function usePayFlowAccess() {
  const ctx = useContext(PayFlowContext);
  if (!ctx) throw new Error("usePayFlowAccess must be used inside PayFlowAccessProvider");
  return ctx;
}
