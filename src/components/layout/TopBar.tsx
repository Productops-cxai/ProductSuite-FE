import { ProductSwitcher } from "../ProductSwitcher";
import { useAuth } from "../../context/AuthContext";

function SidebarToggleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9 4.5v15" />
    </svg>
  );
}

type Props = {
  onMenuClick?: () => void;
  menuOpen?: boolean;
};

export function TopBar({ onMenuClick, menuOpen }: Props) {
  const { isSuperAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 shadow-card backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick ? (
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
            title={menuOpen ? "Close menu" : "Open menu"}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={onMenuClick}
          >
            <SidebarToggleIcon />
          </button>
        ) : null}
        <img
          src="/assets/payflow-mark.png"
          alt=""
          className="hidden size-8 shrink-0 object-contain sm:block lg:hidden"
        />
        <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
          Platform administration ·{" "}
          <span className="font-medium text-slate-800 dark:text-slate-200">
            product entitlement only
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {isSuperAdmin ? (
          <ProductSwitcher current="platform" variant="platform" />
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-[3px] text-[11px] font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-950 dark:text-blue-100">
            <span className="size-1.5 rounded-full bg-primary" />
            User
          </span>
        )}
      </div>
    </header>
  );
}
