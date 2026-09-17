import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ResetPasswordPage } from './ResetPasswordPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { api } from '@/lib/api';

const renderReset = (search = '?token=reset-token') =>
  renderWithProviders(
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login" element={<h1>Sign in</h1>} />
    </Routes>,
    { initialEntries: [`/reset-password${search}`] },
  );

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ForgotPasswordPage', () => {
  it('confirms the request without revealing whether the email exists', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { message: 'If that email is registered, a password reset link has been sent.' },
    });
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>,
      { initialEntries: ['/forgot-password'] },
    );

    await user.type(screen.getByLabelText(/email/i), 'admin@gym.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/if that email is registered/i);
  });
});

describe('ResetPasswordPage', () => {
  it('enforces the password policy before calling the API', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderReset();

    await user.type(screen.getByLabelText(/^new password/i), 'short');
    await user.type(screen.getByLabelText(/confirm/i), 'short');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation', async () => {
    const user = userEvent.setup();
    renderReset();

    await user.type(screen.getByLabelText(/^new password/i), 'BrandNew1');
    await user.type(screen.getByLabelText(/confirm/i), 'Different1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('submits the token from the URL and sends the user to sign in', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { message: 'Updated' } });
    const user = userEvent.setup();
    renderReset();

    await user.type(screen.getByLabelText(/^new password/i), 'BrandNew1');
    await user.type(screen.getByLabelText(/confirm/i), 'BrandNew1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'reset-token',
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('explains a missing token instead of showing an unusable form', () => {
    renderReset('');

    expect(screen.getByRole('alert')).toHaveTextContent(/reset link is invalid/i);
    expect(screen.queryByLabelText(/^new password/i)).not.toBeInTheDocument();
  });

  it('surfaces an expired-token error from the server', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { data: { error: { message: 'This reset link is invalid or has expired' } } },
    });
    const user = userEvent.setup();
    renderReset();

    await user.type(screen.getByLabelText(/^new password/i), 'BrandNew1');
    await user.type(screen.getByLabelText(/confirm/i), 'BrandNew1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
  });
});
