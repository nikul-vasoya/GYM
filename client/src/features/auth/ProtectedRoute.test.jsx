import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ProtectedRoute } from './ProtectedRoute';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const Protected = () => <h1>Member list</h1>;
const Login = () => <h1>Sign in</h1>;

const renderApp = (initialPath) =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/members" element={<Protected />} />
      </Route>
    </Routes>,
    { initialEntries: [initialPath] },
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('redirects to the login page when there is no token', async () => {
    renderApp('/members');

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('Member list')).not.toBeInTheDocument();
  });

  it('renders the protected page when the stored token is valid', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { user: { id: '1', name: 'Gym Admin', email: 'admin@gym.com' } },
    });

    renderApp('/members');

    expect(await screen.findByText('Member list')).toBeInTheDocument();
  });

  it('redirects and clears the token when the stored token is rejected', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'stale-token');
    vi.spyOn(api, 'get').mockRejectedValue({ response: { status: 401 } });

    renderApp('/members');

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });

  it('shows a loading state while the session is being checked', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    vi.spyOn(api, 'get').mockImplementation(() => new Promise(() => {}));

    renderApp('/members');

    expect(await screen.findByRole('status', { name: /checking/i })).toBeInTheDocument();
  });
});
