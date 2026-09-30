import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthProvider";

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  redirectPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectPath = "/signin",
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-background)]">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
