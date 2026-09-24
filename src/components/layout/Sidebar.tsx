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

const item =
  "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[0.92rem] font-medium text-slate-400";

export function Sidebar({ sections }: Props) {
  return (
    <aside className="flex min-h-screen flex-col border-r border-white/10 bg-sidebar px-3.5 py-5 text-slate-400">
      <div className="flex items-center gap-3 px-2.5 pb-[22px] pt-1.5">
        <img src="/assets/payflow-mark.png" alt="" className="size-8 shrink-0 object-contain" />
        <div>
          <strong className="font-display block text-[0.98rem] font-bold leading-tight tracking-tight text-slate-50">
            Platform
          </strong>
          <span className="text-[0.75rem] text-slate-400">Super Admin</span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {sections.map((section) => (
          <div className="mb-[18px]" key={section.key}>
            <div className="px-3 pb-2 text-[0.68rem] font-bold tracking-[0.08em] text-slate-500">
              {section.label}
            </div>
            {section.items.map((itemRow) => {
              const route = normalizeMenuRoute(itemRow.route);
              if (itemRow.is_coming_soon) {
                return (
                  <div className={`${item} cursor-default opacity-70`} key={itemRow.key}>
                    <Icon name={iconFor(itemRow.key, itemRow.icon)} />
                    <span>{itemRow.label}</span>
                    <span className="ml-auto rounded-full border border-slate-700 px-2 py-0.5 text-[0.62rem] font-semibold text-slate-400">
                      {itemRow.badge || "Soon"}
                    </span>
                  </div>
                );
              }
              return (
                <NavLink
                  key={itemRow.key}
                  to={route}
                  end={route === "/platform"}
                  className={({ isActive }) =>
                    `${item} ${
                      isActive
                        ? "bg-blue-500/15 text-slate-50"
                        : "hover:bg-slate-400/10 hover:text-slate-200"
                    }`
                  }
                >
                  <Icon name={iconFor(itemRow.key, itemRow.icon)} />
                  <span>{itemRow.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-auto px-2.5 pt-3">
        <NavLink
          to="/products"
          className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[0.88rem] font-medium text-slate-400 hover:bg-slate-400/10 hover:text-slate-200"
        >
          <span aria-hidden>←</span>
          Product selection
        </NavLink>
      </div>
    </aside>
  );
}
