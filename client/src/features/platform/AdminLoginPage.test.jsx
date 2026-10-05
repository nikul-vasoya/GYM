import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminLoginPage } from './AdminLoginPage';
import { api, TOKEN_STORAGE_KEY, SCOPE_STORAGE_KEY } from '@/lib/api';

const renderAdminLogin = () =>
  renderWithProviders(
    <Routes>
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/admin/gyms" element={<h1>Gyms</h1>} />
    </Routes>,
    { initialEntries: ['/admin-login'] },
  );

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AdminLoginPage', () => {
  it('is a separate door from the gym sign-in', async () => {
    renderAdminLogin();

    expect(screen.getByText('Platform sign in')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    // No password-reset flow here: there is one platform account, not a team.
    expect(screen.queryByRole('link', { name: /forgot password/i })).not.toBeInTheDocument();
  });

  it('signs in with the platform scope and lands on the gyms console', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        token: 'platform-token',
        user: { id: '1', name: 'Platform Admin', email: 'super@platform.com', role: 'superadmin' },
        gym: null,
      },
    });
    const user = userEvent.setup();
    renderAdminLogin();

    await user.type(screen.getByLabelText(/email/i), 'super@platform.com');
    await user.type(screen.getByLabelText(/^password/i), 'Super@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('heading', { name: 'Gyms' })).toBeInTheDocument();

    expect(post).toHaveBeenCalledWith('/auth/login', {
      identifier: 'super@platform.com',
      password: 'Super@123',
      scope: 'platform',
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('platform-token');
      // Remembered so an expired session returns here, not to the gym page.
      expect(window.localStorage.getItem(SCOPE_STORAGE_KEY)).toBe('platform');
    });
  });

  it('shows the server’s message when a gym account tries this door', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: {
        status: 403,
        data: { error: { message: 'This account signs in at the gym sign-in page' } },
      },
    });
    const user = userEvent.setup();
    renderAdminLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/^password/i), 'Admin@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('gym sign-in page');
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
