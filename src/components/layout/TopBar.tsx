import { ProductSwitcher } from "../ProductSwitcher";
import { useAuth } from "../../context/AuthContext";

export function TopBar() {
  const { isSuperAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 shadow-card backdrop-blur-xl lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <img src="/assets/payflow-mark.png" alt="" className="size-8 shrink-0 object-contain lg:hidden" />
        <p className="truncate text-[12px] text-slate-500">
          Platform administration ·{" "}
          <span className="font-medium text-slate-800">product entitlement only</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {isSuperAdmin ? (
          <ProductSwitcher current="platform" variant="platform" />
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-[3px] text-[11px] font-medium text-blue-700">
            <span className="size-1.5 rounded-full bg-primary" />
            User
          </span>
        )}
      </div>
    </header>
  );
}
