import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { myProducts } from "../../api/platform";
import { useAuth } from "../../context/AuthContext";
import { AccessDenied } from "./AccessDenied";

type Props = {
  productCode: string;
  productLabel?: string;
  children: ReactNode;
};

/**
 * Guards product shells (e.g. /payflow). Re-checks entitlement with the API so
 * revoked assignments are enforced even if the client session is still open.
 */
export function RequireProductAccess({ productCode, productLabel, children }: Props) {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStatus("denied");
      return;
    }

    let cancelled = false;
    setStatus("checking");

    void myProducts()
      .then((list) => {
        if (cancelled) return;
        const code = productCode.toUpperCase();
        const allowed = list.some((p) => p.code.toUpperCase() === code);
        if (allowed) {
          setStatus("ok");
          return;
        }
        const label = productLabel || productCode;
        setMessage(
          `You do not have access to ${label}. Your organization entitlement or people assignment may have been removed. Contact your platform administrator.`,
        );
        setStatus("denied");
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(
          err instanceof ApiError
            ? err.detail
            : "Product access unavailable for your organization or account.",
        );
        setStatus("denied");
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading, productCode, productLabel]);

  if (loading || status === "checking") {
    return <div className="grid min-h-screen place-items-center text-slate-500">Checking product access…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (status === "denied") {
    return <AccessDenied title="Access denied" message={message} showProductsLink />;
  }

  return <>{children}</>;
}
