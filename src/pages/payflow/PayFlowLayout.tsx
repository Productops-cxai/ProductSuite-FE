import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  listPayflowClients,
  listPayflowNotifications,
  markAllPayflowNotificationsRead,
  markPayflowNotificationRead,
} from "../../api/payflow";
import { RequireProductAccess } from "../../components/auth/RequireProductAccess";
import { ProductSwitcher } from "../../components/ProductSwitcher";
import { Icon } from "../../components/ui/Icon";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useAuth } from "../../context/AuthContext";
import {
  PayFlowAccessProvider,
  permissionsForPath,
  RequirePayflowPermission,
  usePayFlowAccess,
} from "../../context/PayFlowAccessContext";
import type { MenuSection, PayflowNotification } from "../../types";
import { normalizeMenuRoute } from "../../lib/utils";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function NotificationBell() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PayflowNotification[]>([]);
  const [unread, setUnread] = useState(0);

  async function refresh() {
    try {
      const res = await listPayflowNotifications();
      setItems(res.notifications || []);
      setUnread(res.unread_count || 0);
    } catch {
      /* non-blocking */
    }
  }

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const preview = items.filter((n) => !n.read).slice(0, 4);
  const shown = preview.length > 0 ? preview : items.slice(0, 4);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative grid size-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        title="Notifications"
        aria-label={`Notifications${unread ? `: ${unread} unread` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Needs your attention
            </p>
          </div>
          <div className="max-h-[320px] overflow-y-auto py-1">
            {shown.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-slate-500">
                Nothing needs a decision. Automation is running within governance.
              </p>
            ) : (
              shown.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  role="menuitem"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => {
                    void (async () => {
                      if (!n.read) {
                        try {
                          await markPayflowNotificationRead(n.id);
                          setItems((prev) =>
                            prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                          );
                          setUnread((c) => Math.max(0, c - 1));
                        } catch {
                          /* ignore */
                        }
                      }
                      setOpen(false);
                      if (n.link) navigate(n.link);
                    })();
                  }}
                >
                  <span className="text-[12px] font-medium text-slate-900 dark:text-slate-100">
                    {n.title}
                  </span>
                  {n.body && (
                    <span className="text-[11px] text-slate-500">{n.body}</span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
            <button
              type="button"
              className="text-[12px] font-medium text-primary hover:underline"
              onClick={() => {
                setOpen(false);
                navigate("/payflow/review");
              }}
            >
              View all human reviews
            </button>
            {unread > 0 && (
              <button
                type="button"
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                onClick={() => {
                  void markAllPayflowNotificationsRead()
                    .then((res) => {
                      setItems(res.notifications || []);
                      setUnread(res.unread_count || 0);
                    })
                    .catch(() => undefined);
                }}
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
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

function AccountMenu({
  open,
  onClose,
  onProfile,
  onLogout,
  userName,
  roleLabel,
  isOperationsAdmin,
  assignedClientCount,
  align = "left",
}: {
  open: boolean;
  onClose: () => void;
  onProfile: () => void;
  onLogout: () => void;
  userName: string;
  roleLabel: string;
  isOperationsAdmin: boolean;
  assignedClientCount: number;
  align?: "left" | "right" | "rail";
}) {
  if (!open) return null;
  const position =
    align === "right"
      ? "right-0 top-[calc(100%+10px)]"
      : align === "rail"
        ? "bottom-0 left-[calc(100%+10px)] w-[280px]"
        : "bottom-full left-0 right-0 mb-2 w-auto";
  return (
    <div
      role="menu"
      className={`absolute z-50 w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${position}`}
    >
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
        onClick={() => {
          onClose();
          onProfile();
        }}
      >
        <UserIcon />
        My Profile
      </button>
      <div className="mx-3 my-1 h-px bg-slate-100 dark:bg-slate-800" />
      <div className="px-4 pb-1 pt-1.5 text-[0.68rem] font-semibold tracking-[0.08em] text-slate-400">
        YOUR ROLE
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-1.5 text-sm">
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {roleLabel} · {userName}
        </span>
        <span className="shrink-0 text-sm font-medium text-primary">Active</span>
      </div>
      <p className="px-4 pb-2 text-xs leading-snug text-slate-400">
        {isOperationsAdmin
          ? "Operations Admin can manage all clients and configuration."
          : assignedClientCount > 0
            ? `You can access ${assignedClientCount} assigned client${assignedClientCount === 1 ? "" : "s"}.`
            : "Supervisors only see assigned clients."}
      </p>
      <div className="mx-3 my-1 h-px bg-slate-100 dark:bg-slate-800" />
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
        onClick={() => {
          onClose();
          onLogout();
        }}
      >
        <LogOutIcon />
        Log out
      </button>
    </div>
  );
}

function SidebarNav({
  collapsed,
  onNavigate,
  sections,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  sections: MenuSection[];
}) {
  return (
    <nav
      className={`min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        collapsed ? "px-2" : "px-3"
      }`}
    >
      <div className={`flex flex-col ${collapsed ? "items-center gap-1.5" : "gap-2"}`}>
        {sections.map((section) => (
          <div className={collapsed ? "w-full" : "p-2"} key={section.key}>
            {!collapsed ? (
              <div className="px-2.5 pb-2 text-[10px] font-semibold tracking-[0.1em] text-[#9aa6bc] uppercase">
                {section.label}
              </div>
            ) : null}
            <ul className={`flex flex-col ${collapsed ? "items-center gap-1" : "gap-1"}`}>
              {section.items.map((item) => {
                const route = normalizeMenuRoute(item.route);
                const end = route === "/payflow";
                if (item.is_coming_soon) {
                  return (
                    <li key={item.key} className={collapsed ? "w-full" : undefined}>
                      <div
                        className={
                          collapsed
                            ? "mx-auto flex size-10 cursor-default items-center justify-center rounded-lg text-[#9aa6bc]/70"
                            : "flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#9aa6bc]/80"
                        }
                        title={item.label}
                      >
                        <Icon name={item.icon || "overview"} className="size-[17px] shrink-0" />
                        {!collapsed ? <span>{item.label}</span> : null}
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={item.key} className={collapsed ? "w-full" : undefined}>
                    <NavLink
                      to={route}
                      end={end}
                      title={item.label}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        collapsed
                          ? `mx-auto flex size-10 items-center justify-center rounded-lg border transition-all duration-150 ${
                              isActive
                                ? "border-white/10 bg-[#2f4060] text-white shadow-[0_8px_20px_-14px_rgba(59,130,246,0.65)]"
                                : "border-transparent text-[#b7c2d4] hover:bg-white/[0.06] hover:text-white"
                            }`
                          : `relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                              isActive
                                ? "border-white/10 bg-[#2f4060] text-white shadow-[0_8px_20px_-14px_rgba(59,130,246,0.65)]"
                                : "border-transparent text-[#b7c2d4] hover:bg-white/[0.06] hover:text-white"
                            }`
                      }
                    >
                      <Icon name={item.icon || "overview"} className="size-[17px] shrink-0 opacity-90" />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

function SidebarPanel({
  collapsed,
  userName,
  avatarUrl,
  roleLabel,
  isOperationsAdmin,
  assignedClientCount,
  sections,
  onNavigate,
  onProfile,
  onLogout,
}: {
  collapsed?: boolean;
  userName: string;
  avatarUrl?: string | null;
  roleLabel: string;
  isOperationsAdmin: boolean;
  assignedClientCount: number;
  sections: MenuSection[];
  onNavigate?: () => void;
  onProfile: () => void;
  onLogout: () => void;
}) {
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

  const scopeHint = isOperationsAdmin
    ? "All clients in view"
    : assignedClientCount === 1
      ? "1 assigned client"
      : `${assignedClientCount} assigned clients`;

  return (
    <>
      <div
        className={`flex h-[68px] shrink-0 items-center ${
          collapsed ? "justify-center px-0" : "px-4"
        }`}
      >
        {collapsed ? (
          <img
            src="/assets/payflow-mark.png"
            alt="PayFlow"
            className="block size-9 object-contain"
          />
        ) : (
          <img
            src="/assets/payflow-logo-transparent.png"
            alt="PayFlow — Automate. Engage. Recover."
            className="block h-11 w-auto max-w-full object-contain object-left brightness-0 invert"
          />
        )}
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} sections={sections} />

      <div
        ref={accountRef}
        className={`relative mt-auto flex shrink-0 flex-col border-t border-white/10 ${
          collapsed ? "items-center gap-0 p-2" : "gap-2 p-2.5"
        }`}
      >
        <AccountMenu
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          onProfile={onProfile}
          onLogout={onLogout}
          userName={userName}
          roleLabel={roleLabel}
          isOperationsAdmin={isOperationsAdmin}
          assignedClientCount={assignedClientCount}
          align={collapsed ? "rail" : "left"}
        />
        {!collapsed ? (
          <div className="px-1.5 pb-1 pt-0.5 text-[11px] text-slate-400">{scopeHint}</div>
        ) : null}
        <button
          type="button"
          className={
            collapsed
              ? `flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/5 ${
                  accountOpen ? "bg-white/5" : ""
                }`
              : `flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5 ${
                  accountOpen ? "bg-white/5" : ""
                }`
          }
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          title={userName}
          onClick={() => setAccountOpen((open) => !open)}
        >
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/25 text-[11px] font-bold text-primary">
            <UserAvatar name={userName} avatarUrl={avatarUrl} size="md" className="bg-primary/25" />
          </span>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-semibold text-white">{userName}</p>
                <p className="truncate text-[11px] text-slate-400">{roleLabel}</p>
              </div>
              <ChevronsUpDownIcon />
            </>
          ) : null}
        </button>
      </div>
    </>
  );
}

function PayFlowShell() {
  const { user, logout } = useAuth();
  const { loading, error, menus, roleLabel, isOperationsAdmin, access } = usePayFlowAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const routePerms = permissionsForPath(location.pathname);
  const isMobile = useIsMobile();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerAccountOpen, setHeaderAccountOpen] = useState(false);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const headerAccountRef = useRef<HTMLDivElement>(null);

  const assignedClientCount = access?.client_ids?.length ?? 0;

  useEffect(() => {
    let cancelled = false;
    // Header "clients in view" — ops admin sees all; supervisor sees assigned only.
    if (isOperationsAdmin) {
      void listPayflowClients({})
        .then((res) => {
          if (!cancelled) setClientCount(res.clients?.length ?? 0);
        })
        .catch(() => {
          if (!cancelled) setClientCount(null);
        });
    } else {
      setClientCount(assignedClientCount);
    }
    return () => {
      cancelled = true;
    };
  }, [isOperationsAdmin, assignedClientCount]);

  useEffect(() => {
    if (!headerAccountOpen) return;
    function onDoc(e: MouseEvent) {
      if (!headerAccountRef.current?.contains(e.target as Node)) setHeaderAccountOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setHeaderAccountOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [headerAccountOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-500">Loading PayFlow…</div>
    );
  }

  if (error || !menus.length) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center text-slate-600">
        <div>
          <p className="text-sm font-semibold text-slate-900">Unable to load PayFlow access</p>
          <p className="mt-2 text-sm text-slate-500">
            {error || "No navigation is available for your PayFlow role."}
          </p>
        </div>
      </div>
    );
  }

  function toggleSidebar() {
    if (isMobile) {
      setMobileOpen((v) => !v);
      return;
    }
    setDesktopCollapsed((v) => !v);
  }

  const panelProps = {
    userName: user.full_name,
    avatarUrl: user.avatar_url,
    roleLabel,
    isOperationsAdmin,
    assignedClientCount: isOperationsAdmin ? clientCount ?? 0 : assignedClientCount,
    sections: menus,
    onProfile: () => navigate("/payflow/profile"),
    onLogout: () => void logout(),
  };

  const headerClientCount = clientCount;
  const headerCountLabel =
    headerClientCount == null
      ? "…"
      : `${headerClientCount} client${headerClientCount === 1 ? "" : "s"}`;

  return (
    <div className="flex min-h-screen w-full bg-[#f3f5f9] dark:bg-[#0b1220]">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-sidebar text-slate-400 shadow-[8px_0_32px_-24px_rgba(18,26,43,0.65)] transition-[width] duration-200 md:flex ${
          desktopCollapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarPanel {...panelProps} collapsed={desktopCollapsed} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-sidebar text-slate-400 shadow-2xl">
            <SidebarPanel {...panelProps} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col bg-[#f5f7fb] dark:bg-[#0b1220]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 shadow-card backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title={desktopCollapsed || mobileOpen ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={desktopCollapsed || mobileOpen ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleSidebar}
            >
              <SidebarToggleIcon />
            </button>
            <img
              src="/assets/payflow-logo-transparent.png"
              alt="PayFlow"
              className="block h-8 w-auto max-w-[140px] object-contain object-left md:hidden"
            />
            <span className="hidden truncate text-[12px] text-slate-400 lg:inline">
              Collections operations ·{" "}
              <strong className="font-medium text-slate-700 dark:text-slate-300">
                {headerCountLabel}
              </strong>{" "}
              in view
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <ProductSwitcher current="PAYFLOW" variant="product" />
            <NotificationBell />
            <span className="mx-1 hidden h-7 w-px bg-slate-200 dark:bg-slate-700 lg:block" aria-hidden />
            <div className="relative" ref={headerAccountRef}>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-haspopup="menu"
                aria-expanded={headerAccountOpen}
                onClick={() => setHeaderAccountOpen((open) => !open)}
              >
                <UserAvatar
                  name={user.full_name}
                  avatarUrl={user.avatar_url}
                  size="md"
                  className="bg-primary/10"
                />
                <div className="hidden sm:block">
                  <strong className="block text-[13px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                    {user.full_name}
                  </strong>
                  <span className="block text-[11px] leading-tight text-slate-400">{roleLabel}</span>
                </div>
              </button>
              <AccountMenu
                open={headerAccountOpen}
                align="right"
                onClose={() => setHeaderAccountOpen(false)}
                onProfile={() => navigate("/payflow/profile")}
                onLogout={() => void logout()}
                userName={user.full_name}
                roleLabel={roleLabel}
                isOperationsAdmin={isOperationsAdmin}
                assignedClientCount={
                  isOperationsAdmin ? clientCount ?? 0 : assignedClientCount
                }
              />
            </div>
          </div>
        </header>
        <main className="relative flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-7 lg:px-10 lg:py-9">
            {routePerms ? (
              <RequirePayflowPermission anyOf={routePerms}>
                <Outlet />
              </RequirePayflowPermission>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export function PayFlowLayout() {
  return (
    <RequireProductAccess productCode="PAYFLOW" productLabel="PayFlow">
      <PayFlowAccessProvider>
        <PayFlowShell />
      </PayFlowAccessProvider>
    </RequireProductAccess>
  );
}
