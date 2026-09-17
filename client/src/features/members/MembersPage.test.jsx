import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { MembersPage } from './MembersPage';
import { api } from '@/lib/api';

const member = (overrides = {}) => ({
  id: '1',
  name: 'Priya Sharma',
  phone: '9811111111',
  email: 'priya@example.com',
  gender: 'female',
  packageName: '3 Months',
  packagePrice: 4000,
  durationMonths: 3,
  startDate: '2026-01-10',
  endDate: '2026-04-09',
  status: 'active',
  daysRemaining: 25,
  ...overrides,
});

const listResponse = (data = [member()]) => ({
  data: { data, pagination: { page: 1, limit: 20, total: data.length, totalPages: 1 } },
});

const renderMembers = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<MembersPage />} />
      <Route path="/members/:id" element={<h1>Member detail</h1>} />
    </Routes>,
  );

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockImplementation((url) => {
    if (url.startsWith('/packages')) {
      return Promise.resolve({
        data: { data: [{ id: 'p1', name: '3 Months', durationMonths: 3, price: 4000 }] },
      });
    }
    return Promise.resolve(listResponse());
  });
});

describe('MembersPage', () => {
  it('renders the title and Add New Member button (SRS §2.1)', async () => {
    renderMembers();

    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add new member/i })).toBeInTheDocument();
  });

  it('renders exactly the columns the SRS specifies', async () => {
    renderMembers();

    for (const header of ['Sr. No.', 'Name', 'Package', 'Start Date', 'End Date', 'Action']) {
      expect(await screen.findByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('renders a member row with formatted dates', async () => {
    renderMembers();

    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('10 Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('9 Apr 2026')).toBeInTheDocument();
  });

  it('debounces the search into the request', async () => {
    const user = userEvent.setup();
    renderMembers();

    await screen.findByText('Priya Sharma');
    await user.type(screen.getByRole('searchbox', { name: /search members/i }), 'priya');

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=priya'));
      },
      { timeout: 2000 },
    );
  });

  it('navigates to the member detail page from the View action', async () => {
    const user = userEvent.setup();
    renderMembers();

    await user.click(await screen.findByRole('button', { name: /view priya sharma/i }));

    expect(await screen.findByRole('heading', { name: 'Member detail' })).toBeInTheDocument();
  });

  it('shows an empty state with a call to action', async () => {
    api.get.mockImplementation((url) =>
      url.startsWith('/packages')
        ? Promise.resolve({ data: { data: [] } })
        : Promise.resolve(listResponse([])),
    );

    renderMembers();

    expect(await screen.findByText(/no members yet/i)).toBeInTheDocument();
  });
});
