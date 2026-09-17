import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getMenus } from "../../api/platform";
import { useAuth } from "../../context/AuthContext";
import type { MenuSection } from "../../types";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const FALLBACK_MENUS: MenuSection[] = [
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

export function PlatformLayout() {
  const { loading, user, isSuperAdmin } = useAuth();
  const [sections, setSections] = useState<MenuSection[]>(FALLBACK_MENUS);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void getMenus()
      .then((res) => {
        if (res.sections?.length) setSections(res.sections);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, [isSuperAdmin]);

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/products" replace />;

  return (
    <div className="shell">
      <Sidebar sections={sections} />
      <div className="shell-main">
        <TopBar />
        <Outlet />
      </div>
    </div>
  );
}
