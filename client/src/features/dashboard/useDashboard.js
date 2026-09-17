import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const dashboardKeys = { summary: ['dashboard', 'summary'] };

export const useDashboardSummary = () =>
  useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: async () => {
      const { data } = await api.get('/dashboard/summary');
      return data.data;
    },
  });
