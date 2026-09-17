import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { LoginPage } from './LoginPage';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const renderLogin = () =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<h1>Dashboard</h1>} />
      <Route path="/forgot-password" element={<h1>Forgot password</h1>} />
    </Routes>,
    { initialEntries: ['/login'] },
  );

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('LoginPage', () => {
  it('renders the fields from SRS §1.2', () => {
    renderLogin();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('validates before calling the API', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('signs in and redirects to the dashboard', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { token: 'jwt-token', user: { id: '1', name: 'Gym Admin', email: 'admin@gym.com' } },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/password/i), 'Admin@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('jwt-token');
    });
  });

  it('shows the server message when credentials are rejected', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 401, data: { error: { message: 'Invalid email or password' } } },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('disables the button while signing in', async () => {
    vi.spyOn(api, 'post').mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/password/i), 'Admin@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });
  });
});
