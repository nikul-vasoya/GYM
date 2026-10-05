import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, getErrorMessage } from '@/lib/api';

export const staffKeys = {
  all: ['staff'],
};

/** Everyone who can sign in to this gym. Admin-only (decision M3). */
export const useStaff = () =>
  useQuery({
    queryKey: staffKeys.all,
    queryFn: async () => {
      const { data } = await api.get('/staff');
      return data.data;
    },
  });

export const useCreateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values) => {
      const { data } = await api.post('/staff', values);
      return data.data;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success(`${user.name} can now sign in`);
    },
    onError: (error) => {
      if (!error?.response?.data?.error?.details) toast.error(getErrorMessage(error));
    },
  });
};

export const useRemoveStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/staff/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Account removed');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
