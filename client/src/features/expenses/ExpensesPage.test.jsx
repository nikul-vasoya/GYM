import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ExpensesPage } from './ExpensesPage';
import { api } from '@/lib/api';

const expenses = [
  { id: 'e1', date: '2026-02-28', description: 'Treadmill servicing', amount: 4500 },
  { id: 'e2', date: '2026-02-01', description: 'Electricity bill', amount: 8200 },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { data: expenses, summary: { total: 12700, count: 2 } },
  });
});

describe('ExpensesPage', () => {
  it('renders the title, Add Expense button and month filter (SRS §5.2)', async () => {
    renderWithProviders(<ExpensesPage />);

    expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by month/i)).toBeInTheDocument();
  });

  it('renders the columns from SRS §5.4', async () => {
    renderWithProviders(<ExpensesPage />);

    for (const header of ['Sr. No.', 'Date', 'Description', 'Amount', 'Action']) {
      expect(await screen.findByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('shows the rows and the month total', async () => {
    renderWithProviders(<ExpensesPage />);

    expect(await screen.findByText('Treadmill servicing')).toBeInTheDocument();
    expect(screen.getByText('₹4,500')).toBeInTheDocument();
    expect(screen.getByText('₹12,700')).toBeInTheDocument();
  });

  it('defaults the filter to the current month', async () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    renderWithProviders(<ExpensesPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/expenses?month=${thisMonth}`);
    });
  });

  it('refetches when the month changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    await screen.findByText('Treadmill servicing');
    await user.clear(screen.getByLabelText(/filter by month/i));
    await user.type(screen.getByLabelText(/filter by month/i), '2026-02');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/expenses?month=2026-02');
    });
  });

  it('shows the empty-state message for a month with no expenses (SRS §5.5)', async () => {
    api.get.mockResolvedValue({ data: { data: [], summary: { total: 0, count: 0 } } });

    renderWithProviders(<ExpensesPage />);

    expect(await screen.findByText(/no expenses recorded/i)).toBeInTheDocument();
  });

  it('validates the add form before calling the API', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    await user.click(await screen.findByRole('button', { name: /add expense/i }));
    await user.click(await screen.findByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/description must be at least 2 characters/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('records a new expense', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: { id: 'e3', date: '2026-02-15', description: 'Mats', amount: 3000 } } });
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    await user.click(await screen.findByRole('button', { name: /add expense/i }));
    await user.type(await screen.findByLabelText(/description/i), 'Mats');
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '3000');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1]).toMatchObject({ description: 'Mats', amount: 3000 });
  });
});
