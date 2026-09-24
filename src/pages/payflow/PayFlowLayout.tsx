import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { RequireProductAccess } from "../../components/auth/RequireProductAccess";
import { ProductSwitcher } from "../../components/ProductSwitcher";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../../context/AuthContext";

type NavItem = {
  to: string;
  end: boolean;
  label: string;
  icon: string;
  soon?: boolean;
};

const NAV: { label: string; items: NavItem[] }[] = [
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

function ChevronsUpDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="ml-auto size-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function PayFlowShell() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    function onDoc(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  if (!user) return null;

  const roleLabel =
    user.role === "platform_super_admin" ? "Platform Super Admin" : "Operations Admin";

  return (
    <div
      className={`grid min-h-screen bg-[#f3f5f9] transition-[grid-template-columns] duration-200 ${
        sidebarCollapsed ? "grid-cols-[0_1fr]" : "grid-cols-[280px_1fr]"
      }`}
    >
      <aside
        className={`sticky top-0 flex h-screen flex-col border-r border-white/10 bg-sidebar px-2.5 pt-3 text-slate-400 ${
          sidebarCollapsed ? "pointer-events-none overflow-hidden border-0 p-0 opacity-0" : "overflow-visible"
        }`}
      >
        <div className="shrink-0 px-2 pb-3 pt-1">
          <img
            src="/assets/payflow-logo-transparent.png"
            alt="PayFlow — Automate. Engage. Recover."
            className="block h-11 w-auto max-w-full object-contain object-left brightness-0 invert"
          />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((section) => (
            <div className="mb-2" key={section.label}>
              <div className="px-3 pb-1 pt-1 text-[0.65rem] font-bold tracking-[0.08em] text-slate-500">
                {section.label}
              </div>
              {section.items.map((item) =>
                item.soon ? (
                  <div
                    className="flex cursor-default items-center gap-2.5 rounded-md px-3 py-1.5 text-[0.84rem] font-medium text-slate-400"
                    key={item.label}
                  >
                    <Icon name={item.icon} className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[0.84rem] font-medium ${
                        isActive
                          ? "bg-blue-500/20 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`
                    }
                  >
                    <Icon name={item.icon} className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ),
              )}
            </div>
          ))}
        </nav>

        <div ref={accountRef} className="relative mt-auto flex shrink-0 flex-col gap-2 border-t border-white/10 p-2.5">
          {accountOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-900 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => setAccountOpen(false)}
              >
                <UserIcon />
                My Profile
              </button>
              <div className="my-1 border-t border-slate-100" />
              <div className="px-3 pb-1 pt-1.5 text-[0.65rem] font-semibold tracking-[0.08em] text-slate-400">
                PREVIEW ROLE
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                <span className="font-medium text-slate-900">{roleLabel}</span>
                <span className="shrink-0 text-sm font-medium text-primary">Active</span>
              </div>
              <div className="px-3 pb-2 pt-0.5 text-sm text-slate-700">Supervisor · Zeeshan</div>
              <p className="px-3 pb-2 text-xs leading-snug text-slate-400">Supervisors only see assigned clients.</p>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-50"
                onClick={() => void logout()}
              >
                <LogOutIcon />
                Log out
              </button>
            </div>
          )}
          <div className="px-1.5 pb-1 pt-0.5 text-xs text-slate-400">All clients in view</div>
          <button
            type="button"
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5 ${
              accountOpen ? "bg-white/5" : ""
            }`}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((open) => !open)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/25 text-[11px] font-bold text-primary">
              {initials(user.full_name)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-white">{user.full_name}</p>
              <p className="truncate text-xs text-slate-400">{roleLabel}</p>
            </div>
            <ChevronsUpDownIcon />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col bg-[#f5f7fb]">
        <header className="flex min-h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              <SidebarToggleIcon />
            </button>
            <span className="truncate text-[0.86rem] text-slate-400">
              Collections operations · <strong className="font-bold text-slate-600">3 clients</strong> in view
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ProductSwitcher current="PAYFLOW" variant="product" />
            <button type="button" className="relative grid size-9 place-items-center text-slate-500 hover:text-slate-900" title="Notifications" aria-label="Notifications">
              <BellIcon />
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold leading-none text-white ring-2 ring-white">
                5
              </span>
            </button>
            <span className="h-8 w-px bg-slate-200" aria-hidden />
            <div className="flex items-center gap-2.5">
              <div className="font-display grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-[0.75rem] font-bold text-blue-700">
                {initials(user.full_name)}
              </div>
              <div>
                <strong className="block text-[0.88rem] font-semibold leading-tight text-slate-900">{user.full_name}</strong>
                <span className="block text-[0.75rem] leading-tight text-slate-400">{roleLabel}</span>
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
