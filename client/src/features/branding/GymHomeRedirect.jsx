import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/features/auth/useAuth';
import { gymPath } from '@/lib/gymPaths';

/**
 * Catches the addresses gym pages had before they moved under `/<slug>/…`
 * (`/dashboard`, `/members/42`, …) and bare `/`, so old bookmarks still land
 * in the right place: the same page at the signed-in account's own gym.
 */
export const GymHomeRedirect = () => {
  const { user, gym, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div role="status" aria-label="Checking your session" className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user?.role === 'superadmin') return <Navigate to="/admin/gyms" replace />;

  if (gym?.slug) {
    const path = location.pathname === '/' ? '/dashboard' : location.pathname;
    return <Navigate to={`${gymPath(gym.slug, path)}${location.search}`} replace />;
  }

  return <Navigate to="/login" replace state={{ from: location }} />;
};
