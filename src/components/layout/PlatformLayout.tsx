import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getMenus } from "../../api/platform";
import { AccessDenied } from "../auth/AccessDenied";
import { useAuth } from "../../context/AuthContext";
import type { MenuSection } from "../../types";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

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
    ],
  },
  {
    key: "logs",
    label: "LOGS",
    sort_order: 2,
    items: [
      {
        key: "email_logs",
        label: "Email Logs",
        route: "/platform/email-logs",
        icon: "mail",
        sort_order: 1,
        is_coming_soon: false,
      },
      {
        key: "sms_logs",
        label: "SMS Logs",
        route: "/platform/sms-logs",
        icon: "mail",
        sort_order: 2,
        is_coming_soon: false,
      },
      {
        key: "workflow_worker_logs",
        label: "Workflow Worker Logs",
        route: "/platform/worker-logs",
        icon: "document",
        sort_order: 3,
        is_coming_soon: false,
      },
      {
        key: "deletion_logs",
        label: "Deletion Logs",
        route: "/platform/deletion-logs",
        icon: "billing",
        sort_order: 4,
        is_coming_soon: false,
      },
      {
        key: "ai_suggest_jobs",
        label: "AI Suggest Jobs",
        route: "/platform/ai-suggest-jobs",
        icon: "document",
        sort_order: 5,
        is_coming_soon: false,
      },
    ],
  },
  {
    key: "future",
    label: "FUTURE",
    sort_order: 3,
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

export function PlatformLayout() {
  const { loading, user, isSuperAdmin } = useAuth();
  const location = useLocation();
  // Fallback shows all platform menus; BE getMenus() filters Email/SMS Logs to SEED_SUPER_ADMIN_EMAIL.
  const fallback = useMemo(() => BASE_FALLBACK_MENUS, []);
  const [sections, setSections] = useState<MenuSection[]>(fallback);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }
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

  return (
    <div className="flex min-h-screen w-full bg-bg">
      <Sidebar sections={sections} />

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar
            sections={sections}
            onNavigate={() => setMobileOpen(false)}
            className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] shadow-2xl"
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          menuOpen={mobileOpen}
          onMenuClick={() => setMobileOpen((v) => !v)}
        />
        <main className="relative min-w-0 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
