import { NavLink } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
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
  if (key.includes("billing")) return "billing";
  return "overview";
}

export function Sidebar({ sections }: Props) {
  const { logout, user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">P</div>
        <div className="brand-text">
          <strong>Platform</strong>
          <span>Super Admin</span>
        </div>
      </div>

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

      <div className="sidebar-footer">
        <div style={{ fontSize: "0.78rem", marginBottom: 8, color: "#64748b" }}>
          {user?.email}
        </div>
        <Button variant="secondary" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </aside>
  );
}
