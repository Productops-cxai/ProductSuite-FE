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
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/assets/payflow-mark.png" alt="" className="brand-mark-img" />
        <div className="brand-text">
          <strong>Platform</strong>
          <span>Super Admin</span>
        </div>
      </div>

      <div className="sidebar-nav">
        {sections.map((section) => (
          <div className="nav-section" key={section.key}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => {
              const route = normalizeMenuRoute(item.route);
              if (item.is_coming_soon) {
                return (
                  <div className="nav-item soon" key={item.key}>
                    <Icon name={iconFor(item.key, item.icon)} />
                    <span>{item.label}</span>
                    <span className="badge-soon">{item.badge || "Soon"}</span>
                  </div>
                );
              }
              return (
                <NavLink
                  key={item.key}
                  to={route}
                  end={route === "/platform"}
                  className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                >
                  <Icon name={iconFor(item.key, item.icon)} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <NavLink to="/products" className="sidebar-product-link">
          <span className="sidebar-product-arrow" aria-hidden>
            ←
          </span>
          Product selection
        </NavLink>
      </div>
    </aside>
  );
}
