import { Link, Navigate } from "react-router-dom";
import { UserAvatar } from "../components/ui/UserAvatar";
import { useAuth } from "../context/AuthContext";
import { ui } from "../lib/ui";
import { ProfilePage } from "./ProfilePage";

/**
 * Standalone profile for signed-in users who are not inside PayFlow
 * (no product, product launcher, or any authenticated surface).
 */
export function AccountProfilePage() {
  const { user, loading, logout, isSuperAdmin, products } = useAuth();

  if (loading) return <div className={ui.loading}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const home =
    isSuperAdmin ? "/platform" : products.length > 0 ? "/products" : "/no-access";

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 shadow-card backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/assets/payflow-mark.png" alt="" className="h-9 w-auto shrink-0" />
          <div className="min-w-0">
            <strong className="block truncate text-[15px] font-semibold leading-tight text-slate-900 dark:text-slate-50">
              Platform Suite
            </strong>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">My Profile</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <UserAvatar name={user.full_name} avatarUrl={user.avatar_url} size="sm" />
            <span className="max-w-[160px] truncate text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
              {user.full_name}
            </span>
          </div>
          <Link
            to={home}
            className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Back
          </Link>
          <button type="button" className={`${ui.link} text-[13px]`} onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>
      <ProfilePage workspace="account" />
    </div>
  );
}
