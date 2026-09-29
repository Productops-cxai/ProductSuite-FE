import { NavLink } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { normalizeMenuRoute } from "../../lib/utils";
import type { MenuSection } from "../../types";

type Props = {
  sections: MenuSection[];
};

function iconFor(key: string, icon?: string | null) {
  if (icon) return icon;
  if (key.includes("product") && key.includes("access")) return "access";
  if (key.includes("product")) return "products";
  if (key.includes("people")) return "people";
  if (key.includes("email") || key.includes("mail")) return "mail";
  if (key.includes("billing")) return "billing";
  return "overview";
}

export function Sidebar({ sections }: Props) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-white/10 bg-sidebar px-3 py-0 text-slate-400 lg:flex">
      <div className="flex h-[68px] shrink-0 items-center gap-2.5 px-4">
        <img src="/assets/payflow-mark.png" alt="" className="size-8 shrink-0 object-contain" />
        <div className="leading-tight">
          <strong className="block text-[13px] font-semibold text-slate-50">Platform</strong>
          <span className="text-[11px] text-[#9aa6bc]">Super Admin</span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-0 py-2">
        <div className="flex flex-col gap-2">
          {sections.map((section) => (
            <div className="p-2" key={section.key}>
              <div className="px-2.5 pb-2 text-[10px] font-semibold tracking-[0.1em] text-[#9aa6bc] uppercase">
                {section.label}
              </div>
              <ul className="flex flex-col gap-1">
                {section.items.map((itemRow) => {
                  const route = normalizeMenuRoute(itemRow.route);
                  if (itemRow.is_coming_soon) {
                    return (
                      <li key={itemRow.key}>
                        <div className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#9aa6bc]/80">
                          <Icon
                            name={iconFor(itemRow.key, itemRow.icon)}
                            className="size-[17px] shrink-0"
                          />
                          <span className="flex-1">{itemRow.label}</span>
                          <span className="rounded-full border border-white/10 px-1.5 py-px text-[9.5px] text-[#9aa6bc]">
                            {itemRow.badge || "Soon"}
                          </span>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={itemRow.key}>
                      <NavLink
                        to={route}
                        end={route === "/platform"}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                            isActive
                              ? "border-white/10 bg-[#2f4060] text-white shadow-[0_8px_20px_-14px_rgba(59,130,246,0.65)]"
                              : "border-transparent text-[#b7c2d4] hover:bg-white/[0.06] hover:text-white"
                          }`
                        }
                      >
                        <Icon
                          name={iconFor(itemRow.key, itemRow.icon)}
                          className="size-[17px] shrink-0 opacity-90"
                        />
                        <span>{itemRow.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/10 p-3">
        <NavLink
          to="/products"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-medium text-[#b7c2d4] hover:bg-white/[0.06] hover:text-white"
        >
          <span aria-hidden>←</span>
          Product selection
        </NavLink>
      </div>
    </aside>
  );
}
