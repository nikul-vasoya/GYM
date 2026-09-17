import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { AppShell } from './AppShell';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const renderShell = (path = '/members') =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<h1>Sign in</h1>} />
      <Route element={<AppShell />}>
        <Route path="/members" element={<h1>Members</h1>} />
        <Route path="/expenses" element={<h1>Expenses</h1>} />
      </Route>
    </Routes>,
    { initialEntries: [path] },
  );

beforeEach(() => {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { user: { id: '1', name: 'Gym Admin', email: 'admin@gym.com', role: 'admin' } },
  });
});

describe('AppShell', () => {
  it('renders every navigation destination from SRS §7', async () => {
    renderShell();
    const nav = await screen.findByRole('navigation', { name: /main/i });

    for (const label of [
      'Dashboard',
      'Members',
      'Expiry',
      'Action Required',
      'Expenses',
      'Settings',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }

    expect(nav).toBeInTheDocument();
  });

  it('marks the current page as the active link', async () => {
    renderShell('/members');

    const membersLink = await screen.findByRole('link', { name: 'Members' });
    expect(membersLink).toHaveAttribute('aria-current', 'page');

    expect(screen.getByRole('link', { name: 'Expenses' })).not.toHaveAttribute('aria-current');
  });

  it('renders the page content in the outlet', async () => {
    renderShell('/expenses');
    expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
  });

  it('shows the signed-in user', async () => {
    renderShell();
    expect(await screen.findByText('Gym Admin')).toBeInTheDocument();
  });

  it('signs the user out and returns them to the login page', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByRole('button', { name: /account menu/i }));
    await user.click(await screen.findByRole('menuitem', { name: /sign out/i }));

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('toggles the theme and remembers the choice', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByRole('button', { name: /switch to light theme/i }));

    expect(document.documentElement).not.toHaveClass('dark');
    expect(window.localStorage.getItem('gym.theme')).toBe('light');
  });
});
