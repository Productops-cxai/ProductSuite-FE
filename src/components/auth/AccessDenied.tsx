import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";

type Props = {
  title?: string;
  message: string;
  /** Link back to product launcher when the user still has other products */
  showProductsLink?: boolean;
};

/** Shared deny screen for platform admin and product route guards. */
export function AccessDenied({
  title = "Access denied",
  message,
  showProductsLink = true,
}: Props) {
  const { user, logout, isSuperAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img src="/assets/payflow-mark.png" alt="" className="size-9 rounded-lg object-contain" />
          <strong className="font-display text-[1.05rem] font-bold">Platform Suite</strong>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <span className="text-sm text-slate-500" title={user.email}>
              {user.full_name}
            </span>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-8 pb-16">
        <p className="mb-2 text-[0.72rem] font-bold tracking-[0.12em] text-slate-400">AUTHORIZATION</p>
        <h1 className="font-display text-[2rem] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-500">{message}</p>
        <div className="mt-5">
          {showProductsLink ? (
            <Link
              to={isSuperAdmin ? "/platform" : "/products"}
              className="inline-flex items-center rounded-lg bg-primary px-3.5 py-2 text-[0.9rem] font-semibold text-white hover:bg-primary-hover"
            >
              {isSuperAdmin ? "Open Platform administration" : "Back to products"}
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}
