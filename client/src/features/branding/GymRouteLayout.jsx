import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/features/auth/useAuth';
import { applyGymTheme, clearGymTheme } from '@/lib/theme/applyTheme';
import { swapGymSlug } from '@/lib/gymPaths';
import { GymBrandingContext } from './GymBrandingContext';
import { GymNotFoundPage } from './GymNotFoundPage';
import { usePublicGym } from './usePublicGym';

const FullPageSpinner = ({ label }) => (
  <div role="status" aria-label={label} className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="size-6 animate-spin text-muted-foreground" />
  </div>
);

const DEFAULT_TITLE = 'Gym Management';

/** Uses the gym's logo as the tab icon while its pages are open. */
const useFavicon = (href) => {
  useEffect(() => {
    if (!href) return undefined;

    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = href;
    link.dataset.gymIcon = 'true';
    document.head.appendChild(link);

    return () => link.remove();
  }, [href]);
};

/**
 * The frame around every page at `/<slug>/…`.
 *
 * Resolves the gym from the address, paints the app in its theme, and makes
 * its name and logo available to the pages below. The slug is presentation
 * only: data still comes from the signed-in account's own gym on the server.
 *
 * A signed-in account that lands on another gym's address is moved to the
 * same page at its own gym's address, before that other gym's branding is
 * ever requested.
 */
export const GymRouteLayout = () => {
  const { gymSlug = '' } = useParams();
  const location = useLocation();
  const { user, gym: ownGym, isLoading: isAuthLoading } = useAuth();

  const slug = gymSlug.toLowerCase();
  const isGymAccount = Boolean(user && user.role !== 'superadmin' && ownGym);
  const belongsElsewhere = isGymAccount && ownGym.slug !== slug;
  const isOwnGym = isGymAccount && ownGym.slug === slug;

  const query = usePublicGym(isAuthLoading || belongsElsewhere ? null : slug);

  // The signed-in account's own gym is already known from the session, so
  // its pages paint immediately instead of waiting on the public lookup.
  const branding = query.data ?? (isOwnGym ? ownGym : null);

  useEffect(() => {
    applyGymTheme(branding?.theme ?? null);
  }, [branding?.theme]);

  useEffect(() => () => clearGymTheme(), []);

  useEffect(() => {
    if (!branding?.name) return undefined;
    document.title = `${branding.name} · Gym Management`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [branding?.name]);

  useFavicon(branding?.logoUrl);

  if (isAuthLoading) return <FullPageSpinner label="Checking your session" />;

  if (belongsElsewhere) {
    return (
      <Navigate
        to={`${swapGymSlug(location.pathname, ownGym.slug)}${location.search}`}
        replace
      />
    );
  }

  if (!branding && query.isLoading) return <FullPageSpinner label="Loading gym" />;

  if (!branding && query.error?.response?.status === 404) {
    return <GymNotFoundPage slug={slug} />;
  }

  // Any other lookup failure: carry on in the default theme rather than
  // locking staff out of their gym over a cosmetic request.
  return (
    <GymBrandingContext.Provider value={branding}>
      <Outlet />
    </GymBrandingContext.Provider>
  );
};
