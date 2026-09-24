import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { RequireProductAccess } from "../../components/auth/RequireProductAccess";
import { ProductSwitcher } from "../../components/ProductSwitcher";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  {
    label: "OVERVIEW",
    items: [{ to: "/payflow", end: true, label: "Dashboard", icon: "overview" }],
  },
  {
    label: "OPERATIONS",
    items: [
      { to: "/payflow/clients", end: false, label: "Clients", soon: true, icon: "people" },
      { to: "/payflow/cases", end: false, label: "Accounts / Cases", soon: true, icon: "products" },
      { to: "/payflow/review", end: false, label: "Human Review", soon: true, icon: "access" },
    ],
  },
  {
    label: "AI OPERATIONS",
    items: [
      {
        to: "/payflow/workflows",
        end: false,
        label: "Strategies / Workflows",
        soon: true,
        icon: "overview",
      },
      { to: "/payflow/comms", end: false, label: "Communications", soon: true, icon: "mail" },
    ],
  },
  {
    label: "GOVERNANCE",
    items: [{ to: "/payflow/rules", end: false, label: "Rules", soon: true, icon: "billing" }],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { to: "/payflow/users", end: false, label: "Users & Permissions", soon: true, icon: "people" },
      {
        to: "/payflow/integrations",
        end: false,
        label: "Integrations",
        soon: true,
        icon: "products",
      },
    ],
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function SidebarToggleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9 4.5v15" />
    </svg>
  );
}

function PayFlowShell() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  if (!user) return null;

  const roleLabel =
    user.role === "platform_super_admin" ? "Platform Super Admin" : "Operations Admin";

  return (
    <div className={`pf-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="pf-sidebar">
        <div className="pf-brand">
          <img
            src="/assets/payflow-logo-transparent.png"
            alt="PayFlow — Automate. Engage. Recover."
            className="pf-brand-logo"
          />
        </div>

        <nav className="pf-nav">
          {NAV.map((section) => (
            <div className="pf-nav-section" key={section.label}>
              <div className="pf-nav-label">{section.label}</div>
              {section.items.map((item) =>
                item.soon ? (
                  <div className="pf-nav-item soon" key={item.label}>
                    <span className="pf-nav-item-main">
                      <Icon name={item.icon} className="pf-nav-icon" />
                      <span>{item.label}</span>
                    </span>
                    <span className="pf-soon">Soon</span>
                  </div>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `pf-nav-item${isActive ? " active" : ""}`}
                  >
                    <span className="pf-nav-item-main">
                      <Icon name={item.icon} className="pf-nav-icon" />
                      <span>{item.label}</span>
                    </span>
                  </NavLink>
                ),
              )}
            </div>
          ))}
        </nav>

        <div className="pf-sidebar-foot">
          <div className="pf-clients-hint">All clients in view</div>
          <div className="pf-sidebar-user">
            <div className="pf-avatar soft">{initials(user.full_name)}</div>
            <div className="pf-sidebar-user-text">
              <strong>{user.full_name}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="pf-main">
        <header className="pf-topbar">
          <div className="pf-topbar-left">
            <button
              type="button"
              className="pf-sidebar-toggle"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              <SidebarToggleIcon />
            </button>
            <span className="pf-topbar-hint">
              Collections operations · <strong>3 clients</strong> in view
            </span>
          </div>
          <div className="pf-topbar-right">
            <ProductSwitcher current="PAYFLOW" variant="product" />
            <button type="button" className="pf-bell" title="Notifications" aria-label="Notifications">
              <BellIcon />
              <span className="pf-bell-badge">5</span>
            </button>
            <div className="pf-top-user">
              <div className="pf-avatar sm soft">{initials(user.full_name)}</div>
              <div className="pf-top-user-text">
                <strong>{user.full_name}</strong>
                <span>{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

export function PayFlowLayout() {
  return (
    <RequireProductAccess productCode="PAYFLOW" productLabel="PayFlow">
      <PayFlowShell />
    </RequireProductAccess>
  );
}
