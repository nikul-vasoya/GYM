import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, getErrorMessage } from '@/lib/api';

/** Every plan change refreshes both the Settings list and the member-form dropdowns. */
const useRefresh = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['packages'] });
};

/** Create (no id) or update (with id) a plan. Field errors are left to the form. */
export const useSavePackage = () => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn: async ({ id, values }) => {
      const { data } = id
        ? await api.patch(`/packages/${id}`, values)
        : await api.post('/packages', values);
      return data.data;
    },
    onSuccess: (pkg, { id }) => {
      refresh();
      toast.success(id ? `${pkg.name} saved` : `${pkg.name} added`);
    },
    onError: (error) => {
      if (!error?.response?.data?.error?.details) toast.error(getErrorMessage(error));
    },
  });
};

export const useTogglePackage = () => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn: async ({ id, isActive }) => {
      const { data } = await api.patch(`/packages/${id}`, { isActive });
      return data.data;
    },
    onSuccess: (pkg) => {
      refresh();
      toast.success(
        pkg.isActive ? `${pkg.name} is on sale again` : `${pkg.name} is no longer offered to new members`,
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};

export const useDeletePackage = () => {
  const refresh = useRefresh();

  return useMutation({
    mutationFn: async ({ id }) => {
      await api.delete(`/packages/${id}`);
    },
    onSuccess: (_data, { name }) => {
      refresh();
      toast.success(`${name} deleted`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
