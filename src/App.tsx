import { Navigate, Route, Routes } from "react-router-dom";
import { PlatformLayout } from "./components/layout/PlatformLayout";
import { useAuth } from "./context/AuthContext";
import { pathForNextStep } from "./lib/productRouting";
import { ActivatePage } from "./pages/ActivatePage";
import { LoginPage } from "./pages/LoginPage";
import { AccessPage } from "./pages/platform/AccessPage";
import { EmailLogsPage } from "./pages/platform/EmailLogsPage";
import { OverviewPage } from "./pages/platform/OverviewPage";
import { PeoplePage } from "./pages/platform/PeoplePage";
import { ProductDetailPage } from "./pages/platform/ProductDetailPage";
import { ProductsPage } from "./pages/platform/ProductsPage";
import { PayFlowDashboardPage } from "./pages/payflow/DashboardPage";
import { InsightIqPlaceholderPage } from "./pages/payflow/InsightIqPlaceholder";
import { PayFlowLayout } from "./pages/payflow/PayFlowLayout";
import { PayFlowProfilePage } from "./pages/payflow/ProfilePage";
import { NoAccessPage, ProductLauncherPage } from "./pages/ProductLauncherPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

function HomeRedirect() {
  const { loading, user, nextStep, products } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={pathForNextStep(nextStep, products)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/no-access" element={<NoAccessPage />} />
      <Route path="/products" element={<ProductLauncherPage />} />

      <Route path="/platform" element={<PlatformLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="access" element={<AccessPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="email-logs" element={<EmailLogsPage />} />
      </Route>

      <Route path="/payflow" element={<PayFlowLayout />}>
        <Route index element={<PayFlowDashboardPage />} />
        <Route path="profile" element={<PayFlowProfilePage />} />
      </Route>

      <Route path="/insightiq" element={<InsightIqPlaceholderPage />} />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
