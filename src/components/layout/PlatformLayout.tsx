import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { getMenus } from "../../api/platform";
import { AccessDenied } from "../auth/AccessDenied";
import { useAuth } from "../../context/AuthContext";
import { normalizeMenuRoute } from "../../lib/utils";
import type { MenuSection } from "../../types";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** Must match BE SEED_SUPER_ADMIN_EMAIL — Email Logs menu is private to this account. */
export const EMAIL_LOGS_ADMIN_EMAIL = (
  import.meta.env.VITE_EMAIL_LOGS_ADMIN_EMAIL || "admin@suitencri.com"
).toLowerCase();

const BASE_FALLBACK_MENUS: MenuSection[] = [
  {
    key: "platform",
    label: "PLATFORM",
    sort_order: 1,
    items: [
      {
        key: "overview",
        label: "Overview",
        route: "/platform",
        icon: "overview",
        sort_order: 1,
        is_coming_soon: false,
      },
      {
        key: "products",
        label: "Products",
        route: "/platform/products",
        icon: "products",
        sort_order: 2,
        is_coming_soon: false,
      },
      {
        key: "access",
        label: "Product Access",
        route: "/platform/access",
        icon: "access",
        sort_order: 3,
        is_coming_soon: false,
      },
      {
        key: "people",
        label: "People",
        route: "/platform/people",
        icon: "people",
        sort_order: 4,
        is_coming_soon: false,
      },
      {
        key: "email_logs",
        label: "Email Logs",
        route: "/platform/email-logs",
        icon: "mail",
        sort_order: 5,
        is_coming_soon: false,
      },
    ],
  },
  {
    key: "future",
    label: "FUTURE",
    sort_order: 2,
    items: [
      {
        key: "billing",
        label: "Billing & Invoices",
        route: "/platform/billing",
        icon: "billing",
        sort_order: 1,
        is_coming_soon: true,
        badge: "Soon",
      },
    ],
  },
];

function menusForUser(email: string | undefined | null): MenuSection[] {
  const allowEmailLogs = (email || "").toLowerCase() === EMAIL_LOGS_ADMIN_EMAIL;
  return BASE_FALLBACK_MENUS.map((section) => ({
    ...section,
    items: section.items.filter((item) => allowEmailLogs || item.key !== "email_logs"),
  }));
}

export function PlatformLayout() {
  const { loading, user, isSuperAdmin } = useAuth();
  const fallback = useMemo(() => menusForUser(user?.email), [user?.email]);
  const [sections, setSections] = useState<MenuSection[]>(fallback);

  useEffect(() => {
    setSections(fallback);
  }, [fallback]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void getMenus()
      .then((res) => {
        if (res.sections?.length) setSections(res.sections);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, [isSuperAdmin, user?.email]);

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500 dark:text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) {
    return (
      <AccessDenied
        title="Access denied"
        message="Platform Super Admin access is required for this administration area. PayFlow Operations Admin and other product roles cannot open platform-level administration."
        showProductsLink
      />
    );
  }

  const mobileItems = sections
    .flatMap((s) => s.items)
    .filter((item) => !item.is_coming_soon);

  return (
    <div className="flex min-h-screen w-full bg-bg">
      <Sidebar sections={sections} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <nav className="flex gap-1.5 overflow-x-auto border-b border-slate-200/70 bg-white px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-slate-800 dark:bg-slate-900 lg:hidden [&::-webkit-scrollbar]:hidden">
          {mobileItems.map((item) => {
            const route = normalizeMenuRoute(item.route);
            return (
              <NavLink
                key={item.key}
                to={route}
                end={route === "/platform"}
                className={({ isActive }) =>
                  `shrink-0 rounded-md px-3 py-2 text-[12.5px] font-medium whitespace-nowrap ${
                    isActive
                      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <main className="relative min-w-0 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
