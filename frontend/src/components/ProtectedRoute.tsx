import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";

/** Guards routes that require an authenticated session. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
