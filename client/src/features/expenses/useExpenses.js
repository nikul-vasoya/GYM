import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, getErrorMessage } from '@/lib/api';

export const expenseKeys = {
  all: ['expenses'],
  list: (month) => ['expenses', 'list', month],
};

export const useExpenses = (month) =>
  useQuery({
    queryKey: expenseKeys.list(month),
    queryFn: async () => {
      const { data } = await api.get(month ? `/expenses?month=${month}` : '/expenses');
      return data;
    },
    placeholderData: (previous) => previous,
  });

export const useSaveExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data } = id
        ? await api.patch(`/expenses/${id}`, values)
        : await api.post('/expenses', values);
      return data.data;
    },
    onSuccess: (_expense, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(variables.id ? 'Expense updated' : 'Expense recorded');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
