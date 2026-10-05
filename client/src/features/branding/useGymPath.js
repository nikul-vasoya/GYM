import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/useAuth';
import { gymPath } from '@/lib/gymPaths';

/**
 * Returns `to(path)`, which prefixes a path with the current gym's address.
 *
 * Every link inside a gym goes through this, so no page hard-codes a slug
 * and a renamed gym needs no code change. Prefers the slug in the URL, then
 * the signed-in account's gym.
 */
export const useGymPath = () => {
  const { gymSlug } = useParams();
  const { gym } = useAuth();
  const slug = gymSlug ?? gym?.slug;

  return useCallback((path) => (slug ? gymPath(slug, path) : path), [slug]);
};
