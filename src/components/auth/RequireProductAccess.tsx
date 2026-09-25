import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AccessDenied } from "./AccessDenied";

type Props = {
  productCode: string;
  productLabel?: string;
  children: ReactNode;
};

/**
 * Guards product shells (e.g. /payflow) using the session's entitled products
 * from /auth/me (already loaded by AuthProvider). Switching/entering a product
 * still re-validates via POST /products/{code}/enter.
 */
export function RequireProductAccess({ productCode, productLabel, children }: Props) {
  const { user, loading, products } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-slate-500">Checking product access…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const code = productCode.toUpperCase();
  const allowed = products.some((p) => p.code.toUpperCase() === code);
  if (!allowed) {
    const label = productLabel || productCode;
    return (
      <AccessDenied
        title="Access denied"
        message={`You do not have access to ${label}. Your organization entitlement or people assignment may have been removed. Contact your platform administrator.`}
        showProductsLink
      />
    );
  }

  return <>{children}</>;
}
