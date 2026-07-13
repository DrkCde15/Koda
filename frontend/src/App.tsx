import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { ForgotPasswordPage } from "@/pages/ForgotPassword";
import { LoginPage } from "@/pages/Login";
import { PageViewPage } from "@/pages/PageView";
import { ProfilePage } from "@/pages/Profile";
import { RegisterPage } from "@/pages/Register";
import { ResetPasswordPage } from "@/pages/ResetPassword";
import { WorkspaceDetailPage } from "@/pages/WorkspaceDetail";
import DatabaseViewPage from "@/pages/DatabaseView";

export function App() {
  return (
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
        <Route path="workspaces/:workspaceId/databases/:databaseId" element={<DatabaseViewPage />} />
        <Route path="pages/:id" element={<PageViewPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
