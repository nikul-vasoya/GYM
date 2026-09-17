import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from './useAuth';

/**
 * Gate for every authenticated route (SRS §6.4).
 *
 * Remembers where the user was heading so they land there after signing in,
 * instead of always being dumped on the dashboard.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Checking your session"
        className="flex min-h-screen items-center justify-center bg-background"
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
