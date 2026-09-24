import { ProductSwitcher } from "../ProductSwitcher";
import { useAuth } from "../../context/AuthContext";

export function TopBar() {
  const { isSuperAdmin } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-7 py-3.5">
      <div className="text-[0.85rem] text-slate-500">
        Platform administration · <em className="font-semibold not-italic text-slate-600">product entitlement only</em>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {isSuperAdmin ? (
          <ProductSwitcher current="platform" variant="platform" />
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[0.82rem] font-semibold text-blue-700">
            <span className="size-1.5 rounded-full bg-primary" />
            User
          </span>
        )}
      </div>
    </header>
  );
}
