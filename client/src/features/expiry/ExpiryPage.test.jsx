import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ExpiryPage } from './ExpiryPage';
import { api } from '@/lib/api';

const expired = {
  id: 'm1',
  name: 'Lapsed Member',
  packageName: '1 Month',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  status: 'expired',
  daysRemaining: -43,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { data: [expired], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
  });
});

const renderExpiry = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<ExpiryPage />} />
      <Route path="/members/:id" element={<h1>Member detail</h1>} />
    </Routes>,
  );

describe('ExpiryPage', () => {
  it('requests only expired members (SRS §3.2)', async () => {
    renderExpiry();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('status=expired'));
    });
  });

  it('renders the columns from SRS §3.3', async () => {
    renderExpiry();

    for (const header of ['Sr. No.', 'Name', 'Package', 'Start Date', 'End Date', 'Action']) {
      expect(await screen.findByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('shows the expired member and how long ago it lapsed', async () => {
    renderExpiry();

    expect(await screen.findByText('Lapsed Member')).toBeInTheDocument();
    expect(screen.getByText('Expired 43 days ago')).toBeInTheDocument();
  });

  it('shows a positive empty state when nothing has expired', async () => {
    api.get.mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } },
    });

    renderExpiry();

    expect(await screen.findByText(/no expired memberships/i)).toBeInTheDocument();
  });
});
