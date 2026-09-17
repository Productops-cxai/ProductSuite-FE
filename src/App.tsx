import { Navigate, Route, Routes } from "react-router-dom";
import { PlatformLayout } from "./components/layout/PlatformLayout";
import { useAuth } from "./context/AuthContext";
import { AccessPage } from "./pages/AccessPage";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { PeoplePage } from "./pages/PeoplePage";
import { NoAccessPage, ProductLauncherPage } from "./pages/ProductLauncherPage";
import { ProductsPage } from "./pages/ProductsPage";
import type { LoginNextStep } from "./types";

function HomeRedirect() {
  const { loading, user, nextStep, isSuperAdmin } = useAuth();
  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={routeFor(nextStep, isSuperAdmin)} replace />;
}

function routeFor(nextStep: LoginNextStep | null, isSuperAdmin: boolean): string {
  if (isSuperAdmin || nextStep === "platform_admin") return "/platform";
  if (nextStep === "no_access") return "/no-access";
  return "/products";
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/no-access" element={<NoAccessPage />} />
      <Route path="/products" element={<ProductLauncherPage />} />

      <Route path="/platform" element={<PlatformLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="access" element={<AccessPage />} />
        <Route path="people" element={<PeoplePage />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
