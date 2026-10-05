import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/renderWithProviders';
import { StaffPage } from './StaffPage';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const me = { id: 'u1', name: 'Gym Admin', email: 'admin@gym.com', role: 'admin' };

const accounts = [
  { ...me, createdAt: '2026-01-01T00:00:00.000Z' },
  {
    id: 'u2',
    name: 'Front Desk',
    email: 'desk@gym.com',
    role: 'staff',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');

  vi.spyOn(api, 'get').mockImplementation((url) => {
    if (url === '/auth/me') {
      return Promise.resolve({ data: { user: me, gym: { id: 'g1', name: 'Iron House' } } });
    }
    return Promise.resolve({ data: { data: accounts } });
  });
});

describe('StaffPage', () => {
  it('lists the gym’s accounts with their roles', async () => {
    renderWithProviders(<StaffPage />);

    expect(await screen.findByText('Front Desk')).toBeInTheDocument();
    expect(screen.getByText('desk@gym.com')).toBeInTheDocument();

    // Scoped to the table: "Staff" is also the page title.
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    const adminRow = rows.find((row) => within(row).queryByText('Gym Admin'));
    const deskRow = rows.find((row) => within(row).queryByText('Front Desk'));
    expect(within(adminRow).getByText('Administrator')).toBeInTheDocument();
    expect(within(deskRow).getByText('Staff')).toBeInTheDocument();
  });

  it('names the gym the accounts belong to', async () => {
    renderWithProviders(<StaffPage />);

    expect(await screen.findByText(/accounts that can sign in to iron house/i)).toBeInTheDocument();
  });

  it('marks your own account and will not let you remove it', async () => {
    renderWithProviders(<StaffPage />);

    expect(await screen.findByText('(you)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove gym admin/i })).toBeDisabled();
  });

  it('creates a colleague', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: { id: 'u3', name: 'New Hire', role: 'staff' } } });
    const user = userEvent.setup();
    renderWithProviders(<StaffPage />);

    await user.click(await screen.findByRole('button', { name: /add staff/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^name/i), 'New Hire');
    await user.type(within(dialog).getByLabelText(/mobile number/i), '9800011111');
    await user.type(within(dialog).getByLabelText(/email/i), 'hire@gym.com');
    await user.type(within(dialog).getByLabelText(/temporary password/i), 'Newhire123');
    await user.click(within(dialog).getByRole('button', { name: /add account/i }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/staff', {
        name: 'New Hire',
        phone: '9800011111',
        email: 'hire@gym.com',
        password: 'Newhire123',
        role: 'staff',
      });
    });
  });

  it('asks before removing a colleague, then removes them', async () => {
    const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderWithProviders(<StaffPage />);

    await user.click(await screen.findByRole('button', { name: /remove front desk/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/no longer be able to sign in/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /remove account/i }));

    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith('/staff/u2');
    });
  });

  it("resets a colleague's forgotten password", async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { message: 'Password updated' } });
    const user = userEvent.setup();
    renderWithProviders(<StaffPage />);

    await user.click(await screen.findByRole('button', { name: /reset password for front desk/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/new password/i), 'Fresh1234');
    await user.click(within(dialog).getByRole('button', { name: /set password/i }));

    await waitFor(() => expect(put).toHaveBeenCalledWith('/staff/u2/password', { password: 'Fresh1234' }));
  });
});
