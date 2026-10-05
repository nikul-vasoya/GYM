import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export const publicGymKey = (slug) => ['public-gym', slug?.toLowerCase()];

/**
 * A gym's public branding — name, logo, theme — looked up by its address.
 * Available before sign-in, which is the point: `/midcity/login` is already
 * Mid City's page.
 */
export const usePublicGym = (slug) =>
  useQuery({
    queryKey: publicGymKey(slug),
    queryFn: async () => {
      const { data } = await api.get(`/public/gyms/${encodeURIComponent(slug)}`);
      return data.data;
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
    // An unknown gym is an answer, not a blip worth retrying.
    retry: (count, error) => error?.response?.status !== 404 && count < 1,
  });
