import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { MemberDetailPage } from './MemberDetailPage';
import { api } from '@/lib/api';

const member = {
  id: 'm1',
  name: 'Priya Sharma',
  phone: '9811111111',
  email: 'priya@example.com',
  gender: 'female',
  package: 'p3',
  packageName: '3 Months',
  packagePrice: 4000,
  durationMonths: 3,
  startDate: '2026-01-10',
  endDate: '2026-04-09',
  status: 'expiring-soon',
  daysRemaining: 3,
  history: [
    {
      packageName: '1 Month',
      packagePrice: 1500,
      durationMonths: 1,
      startDate: '2025-12-01',
      endDate: '2025-12-31',
    },
  ],
};

const renderDetail = () =>
  renderWithProviders(
    <Routes>
      <Route path="/members/:id" element={<MemberDetailPage />} />
      <Route path="/members" element={<h1>Members list</h1>} />
    </Routes>,
    { initialEntries: ['/members/m1'] },
  );

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockImplementation((url) =>
    url.startsWith('/packages')
      ? Promise.resolve({
          data: { data: [{ id: 'p3', name: '3 Months', durationMonths: 3, price: 4000 }] },
        })
      : Promise.resolve({ data: { data: member } }),
  );
});

describe('MemberDetailPage', () => {
  it('shows the complete member record (SRS §2.4)', async () => {
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Priya Sharma' })).toBeInTheDocument();
    expect(screen.getByText('9811111111')).toBeInTheDocument();
    expect(screen.getByText('priya@example.com')).toBeInTheDocument();
    expect(screen.getByText('3 Months')).toBeInTheDocument();
    expect(screen.getByText('₹4,000')).toBeInTheDocument();
    expect(screen.getByText('10 Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('9 Apr 2026')).toBeInTheDocument();
  });

  it('shows the computed status and days remaining', async () => {
    renderDetail();

    expect(await screen.findByText('Expiring soon')).toBeInTheDocument();
    expect(screen.getByText('3 days left')).toBeInTheDocument();
  });

  it('lists previous membership periods', async () => {
    renderDetail();

    expect(await screen.findByText(/membership history/i)).toBeInTheDocument();
    expect(screen.getByText('1 Month')).toBeInTheDocument();
    expect(screen.getByText('₹1,500')).toBeInTheDocument();
  });

  it('renews the membership', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: { ...member, endDate: '2026-07-09' } } });
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: /renew/i }));
    await user.click(await screen.findByRole('button', { name: /confirm renewal/i }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/members/m1/renew', {}));
  });

  it('shows a not-found message for a missing member', async () => {
    api.get.mockImplementation((url) =>
      url.startsWith('/packages')
        ? Promise.resolve({ data: { data: [] } })
        : Promise.reject({ response: { status: 404, data: { error: { message: 'Member not found' } } } }),
    );

    renderDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent(/member not found/i);
  });
});
