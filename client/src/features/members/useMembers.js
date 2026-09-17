import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, getErrorMessage } from '@/lib/api';

export const memberKeys = {
  all: ['members'],
  list: (params) => ['members', 'list', params],
  detail: (id) => ['members', 'detail', id],
};

/** Drops empty values so the URL stays readable and the cache key stays stable. */
const toQueryString = (params) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }

  return search.toString();
};

export const useMembers = (params = {}) =>
  useQuery({
    queryKey: memberKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get(`/members?${toQueryString(params)}`);
      return data;
    },
    // Keeps the previous page on screen while the next one loads, so the
    // table does not collapse to a skeleton on every keystroke.
    placeholderData: (previous) => previous,
  });

export const useMember = (id) =>
  useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/members/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });

export const usePackages = ({ includeInactive = false } = {}) =>
  useQuery({
    queryKey: ['packages', { includeInactive }],
    queryFn: async () => {
      const { data } = await api.get(`/packages?includeInactive=${includeInactive}`);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

/** Every member mutation invalidates the same keys, so lists and tiles refresh. */
const invalidateMemberData = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: memberKeys.all });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
};

export const useSaveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data } = id
        ? await api.patch(`/members/${id}`, values)
        : await api.post('/members', values);
      return data.data;
    },
    onSuccess: (member, variables) => {
      invalidateMemberData(queryClient);
      toast.success(variables.id ? 'Member updated' : `${member.name} added`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};

export const useRenewMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, packageId }) => {
      const { data } = await api.post(`/members/${id}/renew`, packageId ? { packageId } : {});
      return data.data;
    },
    onSuccess: (member) => {
      invalidateMemberData(queryClient);
      toast.success(`${member.name} renewed until ${member.endDate}`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
