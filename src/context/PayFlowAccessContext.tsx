import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { getPayflowAccessContext, getPayflowMenus } from "../api/payflow";
import type { MenuSection, PayflowAccessContext } from "../types";

interface PayFlowContextValue {
  loading: boolean;
  error: string | null;
  access: PayflowAccessContext | null;
  menus: MenuSection[];
  isOperationsAdmin: boolean;
  roleLabel: string;
  permissions: string[];
  hasPermission: (code: string | string[]) => boolean;
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

  const permissions = access?.all_permissions || [];

  const hasPermission = useCallback(
    (code: string | string[]) => {
      if (access?.is_operations_admin) return true;
      const needed = Array.isArray(code) ? code : [code];
      if (needed.length === 0) return true;
      const held = new Set(permissions);
      return needed.some((c) => held.has(c));
    },
    [permissions, access?.is_operations_admin],
  );

  const value = useMemo<PayFlowContextValue>(
    () => ({
      loading,
      error,
      access,
      menus,
      isOperationsAdmin: Boolean(access?.is_operations_admin),
      roleLabel: access?.role?.name || "PayFlow User",
      permissions,
      hasPermission,
      refresh: () => setTick((t) => t + 1),
    }),
    [loading, error, access, menus, permissions, hasPermission],
  );

  return <PayFlowContext.Provider value={value}>{children}</PayFlowContext.Provider>;
}

export function usePayFlowAccess() {
  const ctx = useContext(PayFlowContext);
  if (!ctx) throw new Error("usePayFlowAccess must be used inside PayFlowAccessProvider");
  return ctx;
}

/** Safe outside PayFlow shell (platform / launcher / no-access profile). */
export function useOptionalPayFlowAccess() {
  return useContext(PayFlowContext);
}

/** Route / page permission gate. */
export function RequirePayflowPermission({
  anyOf,
  children,
  fallbackTo = "/payflow",
}: {
  anyOf: string[];
  children: ReactNode;
  fallbackTo?: string;
}) {
  const { loading, hasPermission } = usePayFlowAccess();
  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking access…</p>;
  }
  if (!hasPermission(anyOf)) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-[18px] font-semibold text-foreground">No access</h2>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Your role does not include the permission needed for this page.
        </p>
        <Link to={fallbackTo} className="mt-3 inline-block text-[13px] font-medium text-primary">
          Back to PayFlow
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

/** Path → required permissions (any-of). Profile is always open. */
export const PAYFLOW_ROUTE_PERMISSIONS: Array<{ prefix: string; anyOf: string[] }> = [
  { prefix: "/payflow/users", anyOf: ["manage_users"] },
  { prefix: "/payflow/integrations", anyOf: ["manage_integrations"] },
  // More specific import routes before parent /clients and /cases prefixes.
  { prefix: "/payflow/clients/import", anyOf: ["import_clients"] },
  { prefix: "/payflow/cases/import", anyOf: ["import_accounts"] },
  { prefix: "/payflow/clients", anyOf: ["view_client"] },
  {
    prefix: "/payflow/cases",
    anyOf: ["view_customer_accounts", "view_collection_cases"],
  },
  {
    prefix: "/payflow/imports",
    anyOf: ["view_customer_accounts", "view_collection_cases", "import_clients", "import_accounts"],
  },
  // /payflow/review, /workflows, /comms — FE parked in src/_design_backup/payflow-ai-ops
  { prefix: "/payflow/rules", anyOf: ["view_rules"] },
];

export function permissionsForPath(pathname: string): string[] | null {
  if (pathname === "/payflow" || pathname === "/payflow/") {
    return null; // Dashboard is open to every PayFlow member
  }
  if (pathname.startsWith("/payflow/profile")) return null;
  // Longest prefix wins so /clients/import is not swallowed by /clients.
  const hit = PAYFLOW_ROUTE_PERMISSIONS.filter(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return hit ? hit.anyOf : null;
}
