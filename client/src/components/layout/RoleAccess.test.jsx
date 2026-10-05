import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { AppShell } from './AppShell';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const signedInAs = (role) => {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      user: { id: '1', name: 'Someone', email: 'someone@gym.com', role },
      gym: role === 'superadmin' ? null : { id: 'g1', name: 'Iron House', slug: 'iron-house' },
    },
  });
};

const renderShell = (path = '/members') =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<h1>Sign in</h1>} />
      <Route path="/admin/gyms" element={<h1>Gyms console</h1>} />
      <Route element={<ProtectedRoute roles={['admin', 'staff']} />}>
        <Route element={<AppShell />}>
          <Route path="/members" element={<h1>Members</h1>} />
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/settings" element={<h1>Settings screen</h1>} />
            <Route path="/staff" element={<h1>Staff screen</h1>} />
          </Route>
        </Route>
      </Route>
      <Route path="/iron-house/dashboard" element={<h1>Dashboard</h1>} />
    </Routes>,
    { initialEntries: [path] },
  );

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('what each role sees', () => {
  it('shows an administrator the staff and settings links', async () => {
    signedInAs('admin');
    renderShell();

    await screen.findByRole('navigation', { name: /main/i });

    expect(screen.getByRole('link', { name: 'Staff' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });

  it('hides them from a staff account', async () => {
    signedInAs('staff');
    renderShell();

    await screen.findByRole('navigation', { name: /main/i });

    expect(screen.queryByRole('link', { name: 'Staff' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    // The daily job is untouched.
    expect(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Expenses' })).toBeInTheDocument();
  });

  it('names the gym the account belongs to', async () => {
    signedInAs('admin');
    renderShell();

    // Once in the sidebar lockup, once in the topbar pill.
    expect(await screen.findAllByText('Iron House')).not.toHaveLength(0);
  });

  it('keeps a staff account off the admin-only screens even by direct URL', async () => {
    signedInAs('staff');
    renderShell('/settings');

    // Bounced to their own home rather than to a sign-in page they are past.
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Settings screen' })).not.toBeInTheDocument();
  });

  it('lets an administrator onto them', async () => {
    signedInAs('admin');
    renderShell('/staff');

    expect(await screen.findByRole('heading', { name: 'Staff screen' })).toBeInTheDocument();
  });

  it('sends the platform operator to their own console, not a gym', async () => {
    signedInAs('superadmin');
    renderShell('/members');

    expect(await screen.findByRole('heading', { name: 'Gyms console' })).toBeInTheDocument();
  });
});
