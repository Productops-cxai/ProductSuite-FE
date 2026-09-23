import { NavLink, Outlet } from "react-router-dom";
import { RequireProductAccess } from "../../components/auth/RequireProductAccess";
import { ProductSwitcher } from "../../components/ProductSwitcher";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  {
    label: "OVERVIEW",
    items: [{ to: "/payflow", end: true, label: "Dashboard" }],
  },
  {
    label: "OPERATIONS",
    items: [
      { to: "/payflow/clients", end: false, label: "Clients", soon: true },
      { to: "/payflow/cases", end: false, label: "Accounts / Cases", soon: true },
      { to: "/payflow/review", end: false, label: "Human Review", soon: true },
    ],
  },
  {
    label: "AI OPERATIONS",
    items: [
      { to: "/payflow/workflows", end: false, label: "Strategies / Workflows", soon: true },
      { to: "/payflow/comms", end: false, label: "Communications", soon: true },
    ],
  },
  {
    label: "GOVERNANCE",
    items: [{ to: "/payflow/rules", end: false, label: "Rules", soon: true }],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { to: "/payflow/users", end: false, label: "Users & Permissions", soon: true },
      { to: "/payflow/integrations", end: false, label: "Integrations", soon: true },
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

function PayFlowShell() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="pf-shell">
      <aside className="pf-sidebar">
        <div className="pf-brand">
          <img src="/assets/payflow-logo.png" alt="PayFlow" className="pf-brand-logo" />
          <div className="pf-brand-tag">AUTOMATE. ENGAGE. RECOVER.</div>
        </div>

        <nav className="pf-nav">
          {NAV.map((section) => (
            <div className="pf-nav-section" key={section.label}>
              <div className="pf-nav-label">{section.label}</div>
              {section.items.map((item) =>
                item.soon ? (
                  <div className="pf-nav-item soon" key={item.label}>
                    <span>{item.label}</span>
                    <span className="pf-soon">Soon</span>
                  </div>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `pf-nav-item${isActive ? " active" : ""}`}
                  >
                    {item.label}
                  </NavLink>
                ),
              )}
            </div>
          ))}
        </nav>

        <div className="pf-sidebar-user">
          <div className="pf-avatar">{initials(user.full_name)}</div>
          <div className="pf-sidebar-user-text">
            <strong>{user.full_name}</strong>
            <span>{user.email}</span>
          </div>
        </div>
      </aside>

      <div className="pf-main">
        <header className="pf-topbar">
          <div className="pf-topbar-left">
            <span className="pf-topbar-hint">Collections operations — sample workspace</span>
          </div>
          <div className="pf-topbar-right">
            <ProductSwitcher current="PAYFLOW" variant="product" />
            <div className="pf-bell" title="Notifications">
              🔔<span className="pf-bell-badge">5</span>
            </div>
            <div className="pf-top-user">
              <div className="pf-avatar sm">{initials(user.full_name)}</div>
              <div>
                <strong>{user.full_name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void logout()}>
              Sign out
            </Button>
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
