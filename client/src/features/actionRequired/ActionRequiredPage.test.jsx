import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ActionRequiredPage } from './ActionRequiredPage';
import { api } from '@/lib/api';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      data: [
        {
          id: 'm1',
          name: 'Renewing Soon',
          packageName: '3 Months',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
          status: 'expiring-soon',
          daysRemaining: 5,
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    },
  });
});

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<ActionRequiredPage />} />
      <Route path="/members/:id" element={<h1>Member detail</h1>} />
    </Routes>,
  );

describe('ActionRequiredPage', () => {
  it('requests only members inside the reminder window (SRS §4.3)', async () => {
    renderPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('status=expiring-soon'));
    });
  });

  it('shows the member and the days remaining', async () => {
    renderPage();

    expect(await screen.findByText('Renewing Soon')).toBeInTheDocument();
    expect(screen.getByText('5 days left')).toBeInTheDocument();
    expect(screen.getByText('Expiring soon')).toBeInTheDocument();
  });

  it('shows an empty state when nobody needs following up', async () => {
    api.get.mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } },
    });

    renderPage();

    expect(await screen.findByText(/nothing needs follow-up/i)).toBeInTheDocument();
  });

  it('explains the reminder thresholds so staff know why the list is what it is', async () => {
    renderPage();

    expect(await screen.findByText(/2 days.*1-month/i)).toBeInTheDocument();
  });
});
