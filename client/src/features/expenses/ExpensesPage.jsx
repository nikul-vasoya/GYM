import { useMemo, useState } from 'react';
import { Pencil, Plus, Receipt } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { MonthPicker } from '@/components/shared/MonthPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useExpenses } from './useExpenses';
import { ExpenseFormDialog } from './ExpenseFormDialog';
import { formatCurrency, formatDate } from '@/lib/format';

const currentMonth = () => new Date().toISOString().slice(0, 7);

export const ExpensesPage = () => {
  const [month, setMonth] = useState(currentMonth);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading } = useExpenses(month);

  const columns = useMemo(
    () => [
      {
        key: 'srNo',
        header: 'Sr. No.',
        className: 'w-16 text-muted-foreground tabular-nums',
        cell: (_row, index) => index + 1,
      },
      {
        key: 'date',
        header: 'Date',
        className: 'whitespace-nowrap',
        cell: (expense) => formatDate(expense.date),
      },
      {
        key: 'description',
        header: 'Description',
        cell: (expense) => <span className="font-medium">{expense.description}</span>,
      },
      {
        key: 'amount',
        header: 'Amount',
        className: 'text-right tabular-nums',
        cell: (expense) => formatCurrency(expense.amount),
      },
      {
        key: 'action',
        header: 'Action',
        className: 'text-right',
        cell: (expense) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${expense.description}`}
            onClick={() => {
              setEditingExpense(expense);
              setIsFormOpen(true);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  const openAddForm = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const summary = data?.summary ?? { total: 0, count: 0 };

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title="Expenses"
        description="Gym running costs, filtered by month."
        actions={
          <Button onClick={openAddForm}>
            <Plus className="mr-2 size-4" />
            Add Expense
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={month} onChange={setMonth} />

        <Card className="py-0">
          <CardContent className="flex items-center gap-4 px-5 py-3">
            <span className="eyebrow">
              {summary.count} expense{summary.count === 1 ? '' : 's'}
            </span>
            <span aria-hidden className="h-5 w-px bg-border" />
            <span className="font-display text-lg font-semibold tabular-nums">
              {formatCurrency(summary.total)}
            </span>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="No expenses recorded for this month"
            description="Pick a different month, or add the first expense for this one."
            action={
              <Button onClick={openAddForm}>
                <Plus className="mr-2 size-4" />
                Add Expense
              </Button>
            }
          />
        }
      />

      <ExpenseFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        expense={editingExpense}
      />
    </>
  );
};
