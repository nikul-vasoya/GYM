import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { DashboardPage } from './DashboardPage';
import { api } from '@/lib/api';

const summary = {
  members: { total: 128, active: 96, expiringSoon: 12, expired: 20 },
  expenses: { month: '2026-03', total: 24500, count: 7 },
  revenue: { month: '2026-03', monthToDate: 86000 },
  recentMembers: [
    {
      id: '1',
      name: 'Priya Sharma',
      packageName: '3 Months',
      endDate: '2026-06-30',
      status: 'active',
      daysRemaining: 107,
    },
  ],
  expenseTrend: [
    { month: '2025-10', total: 1000 },
    { month: '2025-11', total: 2000 },
    { month: '2025-12', total: 1500 },
    { month: '2026-01', total: 3000 },
    { month: '2026-02', total: 2500 },
    { month: '2026-03', total: 24500 },
  ],
};

const renderDashboard = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/action-required" element={<h1>Action Required</h1>} />
    </Routes>,
  );

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('DashboardPage', () => {
  it('shows skeletons while loading', () => {
    vi.spyOn(api, 'get').mockImplementation(() => new Promise(() => {}));
    renderDashboard();

    expect(screen.getAllByRole('status', { name: /loading/i }).length).toBeGreaterThan(0);
  });

  it('renders a tile per member status', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: summary } });
    renderDashboard();

    expect(await screen.findByText('Total members')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Expiring soon')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows the month expense and revenue totals as currency', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: summary } });
    renderDashboard();

    expect(await screen.findByText('₹24,500')).toBeInTheDocument();
    expect(screen.getByText('₹86,000')).toBeInTheDocument();
  });

  it('lists the recent members', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: summary } });
    renderDashboard();

    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ code: 'ERR_NETWORK' });
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i);
  });
});
