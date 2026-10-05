import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, getErrorMessage } from '@/lib/api';

export const gymKeys = {
  all: ['gyms'],
};

/** Every gym on the platform, with its member and staff counts. */
export const useGyms = () =>
  useQuery({
    queryKey: gymKeys.all,
    queryFn: async () => {
      const { data } = await api.get('/gyms');
      return data;
    },
  });

/** Creates a gym together with its first administrator. */
export const useCreateGym = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values) => {
      const { data } = await api.post('/gyms', values);
      return data;
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      toast.success(`${data.name} created`);
    },
    // The dialog shows field errors itself; a toast would duplicate them.
    onError: (error) => {
      if (!error?.response?.data?.error?.details) toast.error(getErrorMessage(error));
    },
  });
};

export const useSetGymStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }) => {
      const { data } = await api.patch(`/gyms/${id}/status`, { isActive });
      return data.data;
    },
    onSuccess: (gym) => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      toast.success(gym.isActive ? `${gym.name} reactivated` : `${gym.name} suspended`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};

/*
 * Gym details and branding.
 */

/** Edits a gym's details, address (slug) or theme. Field errors are left to the form. */
export const useUpdateGym = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }) => {
      const { data } = await api.patch(`/gyms/${id}`, values);
      return data.data;
    },
    onSuccess: (gym) => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      queryClient.invalidateQueries({ queryKey: themeKeys.all });
      // Any open branded page for this gym should repaint on its next visit.
      queryClient.invalidateQueries({ queryKey: ['public-gym'] });
      toast.success(`${gym.name} saved`);
    },
    onError: (error) => {
      if (!error?.response?.data?.error?.details) toast.error(getErrorMessage(error));
    },
  });
};

export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/** Why a file cannot be a logo, or null when it can. Mirrors the server's checks. */
export const logoProblem = (file) => {
  if (!file) return 'Choose an image to upload';
  if (!LOGO_TYPES.includes(file.type)) return 'The logo must be a PNG, JPG, WebP or SVG image';
  if (file.size > LOGO_MAX_BYTES) return 'The logo must be 1 MB or smaller';
  return null;
};

export const useUploadLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }) => {
      const body = new FormData();
      body.append('logo', file);
      // Overrides the instance's JSON default; the browser adds the boundary.
      const { data } = await api.post(`/gyms/${id}/logo`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      queryClient.invalidateQueries({ queryKey: ['public-gym'] });
      toast.success('Logo updated');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};

export const useRemoveLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const { data } = await api.delete(`/gyms/${id}/logo`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      queryClient.invalidateQueries({ queryKey: ['public-gym'] });
      toast.success('Logo removed');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};

/*
 * Themes.
 */

export const themeKeys = {
  all: ['themes'],
};

/** Every theme — built-in first — with how many gyms wear each. */
export const useThemes = () =>
  useQuery({
    queryKey: themeKeys.all,
    queryFn: async () => {
      const { data } = await api.get('/themes');
      return data.data;
    },
    staleTime: 60_000,
  });

export const useSaveTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }) => {
      const { data } = id
        ? await api.patch(`/themes/${id}`, values)
        : await api.post('/themes', values);
      return data.data;
    },
    onSuccess: (theme, { id }) => {
      queryClient.invalidateQueries({ queryKey: themeKeys.all });
      if (id) {
        // Gyms wearing an edited theme show new colours.
        queryClient.invalidateQueries({ queryKey: gymKeys.all });
        queryClient.invalidateQueries({ queryKey: ['public-gym'] });
      }
      toast.success(id ? `${theme.name} saved` : `${theme.name} created`);
    },
    onError: (error) => {
      if (!error?.response?.data?.error?.details) toast.error(getErrorMessage(error));
    },
  });
};

export const useDeleteTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      await api.delete(`/themes/${id}`);
    },
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: themeKeys.all });
      toast.success(`${name} deleted`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};

/** The accounts that sign in to one gym — for the platform administrator. */
export const gymAccountsKey = (gymId) => ['gym-accounts', gymId];

export const useGymAccounts = (gymId) =>
  useQuery({
    queryKey: gymAccountsKey(gymId),
    queryFn: async () => {
      const { data } = await api.get(`/gyms/${gymId}/accounts`);
      return data.data;
    },
    enabled: Boolean(gymId),
  });
