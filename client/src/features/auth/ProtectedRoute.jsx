import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from './useAuth';
import { gymHomePath, gymPath } from '@/lib/gymPaths';

/** Where a signed-in account belongs when it lands somewhere it may not be. */
export const homeFor = (user, gym) => {
  if (user?.role === 'superadmin') return '/admin/gyms';
  return gym?.slug ? gymHomePath(gym.slug) : '/login';
};

/**
 * Gate for every authenticated route (SRS §6.4).
 *
 * Remembers where the user was heading so they land there after signing in,
 * instead of always being dumped on the dashboard.
 *
 * @param {object} props
 * @param {string[]} [props.roles] Roles allowed through. A signed-in account
 *   with the wrong role is sent to its own home rather than to a sign-in
 *   screen it is already past.
 * @param {string} [props.signInPath] Which sign-in screen to send a signed-out
 *   visitor to. Defaults to the current gym's own sign-in page when the URL
 *   is inside one, else the general one.
 */
export const ProtectedRoute = ({ roles, signInPath }) => {
  const { user, gym, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const { gymSlug } = useParams();
  const signIn = signInPath ?? (gymSlug ? gymPath(gymSlug, '/login') : '/login');

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
    return <Navigate to={signIn} replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user, gym)} replace />;
  }

  return <Outlet />;
};
