import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { GymRouteLayout } from '@/features/branding/GymRouteLayout';
import { LoginPage } from './LoginPage';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const renderLogin = () =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/iron-house/dashboard" element={<h1>Dashboard</h1>} />
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

    expect(screen.getByLabelText(/mobile number or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('validates before calling the API', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter your mobile number or email/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('signs in and redirects to the dashboard', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        token: 'jwt-token',
        user: { id: '1', name: 'Gym Admin', email: 'admin@gym.com', role: 'admin' },
        gym: { id: 'g1', name: 'Iron House', slug: 'iron-house' },
      },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/mobile number or email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/^password/i), 'Admin@123');
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

    await user.type(screen.getByLabelText(/mobile number or email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/^password/i), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('disables the button while signing in', async () => {
    vi.spyOn(api, 'post').mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/mobile number or email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/^password/i), 'Admin@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });
  });

  it("signs in at a gym's own address, in its name", async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        data: {
          name: 'Mid City',
          slug: 'midcity',
          logoUrl: null,
          theme: { name: 'Ocean Blue', primary: '#2563eb', accent: null },
        },
      },
    });
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        token: 'jwt-token',
        user: { id: '1', name: 'Owner', email: 'owner@midcity.com', role: 'admin' },
        gym: { id: 'g1', name: 'Mid City', slug: 'midcity' },
      },
    });
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/:gymSlug" element={<GymRouteLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="dashboard" element={<h1>Mid City dashboard</h1>} />
        </Route>
      </Routes>,
      { initialEntries: ['/midcity/login'] },
    );

    expect(await screen.findByText('Sign in to Mid City')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/mobile number or email/i), 'owner@midcity.com');
    await user.type(screen.getByLabelText(/^password/i), 'Midcity123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('heading', { name: 'Mid City dashboard' })).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/auth/login', {
      identifier: 'owner@midcity.com',
      password: 'Midcity123',
      scope: 'gym',
      gymSlug: 'midcity',
    });
  });
});
