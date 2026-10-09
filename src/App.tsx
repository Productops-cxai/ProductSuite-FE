import { Navigate, Route, Routes } from "react-router-dom";
import { PlatformLayout } from "./components/layout/PlatformLayout";
import { useAuth } from "./context/AuthContext";
import { pathForNextStep } from "./lib/productRouting";
import { ActivatePage } from "./pages/ActivatePage";
import { AccountProfilePage } from "./pages/AccountProfilePage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AccessPage } from "./pages/platform/AccessPage";
import { EmailLogsPage } from "./pages/platform/EmailLogsPage";
import { OverviewPage } from "./pages/platform/OverviewPage";
import { PeoplePage } from "./pages/platform/PeoplePage";
import { ProductDetailPage } from "./pages/platform/ProductDetailPage";
import { ProductsPage } from "./pages/platform/ProductsPage";
import { DeletionLogsPage } from "./pages/shared/DeletionLogsPage";
import { PayFlowClientDetailPage } from "./pages/payflow/ClientDetailPage";
import { PayFlowClientNewPage } from "./pages/payflow/ClientNewPage";
import { PayFlowAccountImportPage } from "./pages/payflow/AccountImportPage";
import { PayFlowClientImportPage } from "./pages/payflow/ClientImportPage";
import { PayFlowClientsPage } from "./pages/payflow/ClientsPage";
import { PayFlowImportDetailPage } from "./pages/payflow/ImportDetailPage";
import { PayFlowImportsPage } from "./pages/payflow/ImportsPage";
import { PayFlowPortfolioDetailPage } from "./pages/payflow/PortfolioDetailPage";
import { PayFlowCaseDetailPage } from "./pages/payflow/CaseDetailPage";
import { PayFlowCasesPage } from "./pages/payflow/CasesPage";
import { PayFlowDashboardPage } from "./pages/payflow/DashboardPage";
import { InsightIqPlaceholderPage } from "./pages/payflow/InsightIqPlaceholder";
import { PayFlowIntegrationDetailPage } from "./pages/payflow/IntegrationDetailPage";
import { PayFlowIntegrationsPage } from "./pages/payflow/IntegrationsPage";
import { PayFlowLayout } from "./pages/payflow/PayFlowLayout";
import { PayFlowProfilePage } from "./pages/payflow/ProfilePage";
import { PayFlowRuleDetailPage } from "./pages/payflow/RuleDetailPage";
import { PayFlowRuleNewPage } from "./pages/payflow/RuleNewPage";
import { PayFlowRulesPage } from "./pages/payflow/RulesPage";
import { PayFlowUserDetailPage } from "./pages/payflow/UserDetailPage";
import { PayFlowUsersPage } from "./pages/payflow/UsersPage";
import { NoAccessPage, ProductLauncherPage } from "./pages/ProductLauncherPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { PayFlowHumanReview } from "./pages/payflow/HumanReview";
import { PayFlowWorkflowsPage } from "./pages/payflow/WorkflowsPage";
import { PayFlowWorkflowNewPage } from "./pages/payflow/WorkflowNewPage";
import { PayFlowWorkflowDetailPage } from "./pages/payflow/WorkflowDetailPage";

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
      <Route path="/profile" element={<AccountProfilePage />} />

      <Route path="/platform" element={<PlatformLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="profile" element={<ProfilePage workspace="platform" />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="access" element={<AccessPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="deletion-logs" element={<DeletionLogsPage workspace="platform" />} />
        <Route path="email-logs" element={<EmailLogsPage />} />
      </Route>

      <Route path="/payflow" element={<PayFlowLayout />}>
        <Route index element={<PayFlowDashboardPage />} />
        <Route path="profile" element={<PayFlowProfilePage />} />
        <Route path="clients" element={<PayFlowClientsPage />} />
        <Route path="clients/new" element={<PayFlowClientNewPage />} />
        <Route path="clients/import" element={<PayFlowClientImportPage />} />
        <Route path="clients/:clientId" element={<PayFlowClientDetailPage />} />
        <Route
          path="clients/:clientId/portfolios/:portfolioId"
          element={<PayFlowPortfolioDetailPage />}
        />
        <Route path="cases" element={<PayFlowCasesPage />} />
        <Route path="cases/import" element={<PayFlowAccountImportPage />} />
        <Route path="cases/:accountId" element={<PayFlowCaseDetailPage />} />
        <Route path="imports" element={<PayFlowImportsPage />} />
        <Route path="imports/:importId" element={<PayFlowImportDetailPage />} />
        <Route path="rules" element={<PayFlowRulesPage />} />
        <Route path="rules/new" element={<PayFlowRuleNewPage />} />
        <Route path="rules/:ruleId" element={<PayFlowRuleDetailPage />} />
        <Route path="system-mapping" element={<PayFlowIntegrationsPage />} />
        <Route path="integrations" element={<PayFlowIntegrationsPage />} />
        <Route path="integrations/:integrationId" element={<PayFlowIntegrationDetailPage />} />
        <Route path="users" element={<PayFlowUsersPage />} />
        <Route path="users/:userId" element={<PayFlowUserDetailPage />} />
        <Route path="review" element={<PayFlowHumanReview />} />
        <Route path="workflows" element={<PayFlowWorkflowsPage />} />
        <Route path="workflows/new" element={<PayFlowWorkflowNewPage />} />
        <Route path="workflows/:strategyId" element={<PayFlowWorkflowDetailPage />} />
      </Route>

      <Route path="/insightiq" element={<InsightIqPlaceholderPage />} />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
