import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/pages/Login";
import { RegisterPage } from "@/pages/Register";
import { ForgotPasswordPage } from "@/pages/ForgotPassword";
import { ResetPasswordPage } from "@/pages/ResetPassword";
import { RouteLoader } from "@/components/ui/primitives";

const DashboardPage = lazy(() =>
  import("@/pages/Dashboard").then((m) => ({ default: m.DashboardPage }))
);
const WorkspaceDetailPage = lazy(() =>
  import("@/pages/WorkspaceDetail").then((m) => ({ default: m.WorkspaceDetailPage }))
);
const DatabaseViewPage = lazy(() => import("@/pages/DatabaseView"));
const PageViewPage = lazy(() =>
  import("@/pages/PageView").then((m) => ({ default: m.PageViewPage }))
);
const ProfilePage = lazy(() =>
  import("@/pages/Profile").then((m) => ({ default: m.ProfilePage }))
);

function PageFallback() {
  return <RouteLoader label="Carregando" />;
}

/** Wrapper that forces a full remount of PageViewPage when the page ID changes */
function PageViewPageKeyed() {
  const { id } = useParams<{ id: string }>();
  return <PageViewPage key={id} />;
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="workspaces/:id" element={<WorkspaceDetailPage />} />
          <Route
            path="workspaces/:workspaceId/databases/:databaseId"
            element={<DatabaseViewPage />}
          />
          <Route path="pages/:id" element={<PageViewPageKeyed />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}