import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/renderWithProviders';
import { GymsPage } from './GymsPage';
import { api } from '@/lib/api';

const themes = [
  { id: 't1', key: 'aura-gold', name: 'Aura Gold', primary: '#c9a227', accent: '#8c6a1c', isSystem: true, gymCount: 1 },
  { id: 't2', key: 'ocean-blue', name: 'Ocean Blue', primary: '#2563eb', accent: '#06b6d4', isSystem: true, gymCount: 1 },
];

const gyms = [
  {
    id: 'g1',
    name: 'Iron House',
    slug: 'iron-house',
    contactEmail: 'hello@ironhouse.com',
    contactPhone: '9811111111',
    isActive: true,
    theme: { id: 't1', name: 'Aura Gold', primary: '#c9a227', accent: '#8c6a1c' },
    logoUrl: null,
    memberCount: 24,
    staffCount: 3,
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'g2',
    name: 'Pulse Fitness',
    slug: 'pulse-fitness',
    isActive: false,
    theme: { id: 't2', name: 'Ocean Blue', primary: '#2563eb', accent: '#06b6d4' },
    logoUrl: null,
    memberCount: 0,
    staffCount: 1,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

const listResponse = {
  data: { data: gyms, totals: { gyms: 2, activeGyms: 1, suspendedGyms: 1, members: 24 } },
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockImplementation(async (url) =>
    url === '/themes' ? { data: { data: themes } } : listResponse,
  );
});

describe('GymsPage', () => {
  it('lists every gym with its counts and status', async () => {
    renderWithProviders(<GymsPage />);

    expect(await screen.findByText('Iron House')).toBeInTheDocument();
    expect(screen.getByText('/iron-house/login')).toBeInTheDocument();
    expect(screen.getByText('Pulse Fitness')).toBeInTheDocument();

    // Scoped to the table: the member count also appears in the stat tiles.
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    const ironHouse = rows.find((row) => within(row).queryByText('Iron House'));
    expect(within(ironHouse).getByText('24')).toBeInTheDocument();
    expect(within(ironHouse).getByText('Active')).toBeInTheDocument();

    const pulse = rows.find((row) => within(row).queryByText('Pulse Fitness'));
    expect(within(pulse).getByText('Suspended')).toBeInTheDocument();
    expect(within(pulse).getByText('Ocean Blue')).toBeInTheDocument();
  });

  it('copies the full sign-in link for a gym', async () => {
    // user-event installs a working clipboard stub; read back what landed in it.
    const user = userEvent.setup();
    renderWithProviders(<GymsPage />);

    await user.click(await screen.findByRole('button', { name: /copy sign-in link for iron house/i }));

    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/iron-house/login`);
  });

  it('edits a gym and saves its new theme and address', async () => {
    const patch = vi
      .spyOn(api, 'patch')
      .mockResolvedValue({ data: { data: { ...gyms[0], slug: 'ironhouse' } } });
    const user = userEvent.setup();
    renderWithProviders(<GymsPage />);

    await user.click(await screen.findByRole('button', { name: /^edit iron house/i }));
    const sheet = await screen.findByRole('dialog');

    await user.click(within(sheet).getByRole('tab', { name: /branding/i }));
    await user.click(await within(sheet).findByRole('radio', { name: /ocean blue/i }));

    await user.click(within(sheet).getByRole('tab', { name: /sign-in link/i }));
    const address = within(sheet).getByLabelText(/sign-in address/i);
    await user.clear(address);
    await user.type(address, 'ironhouse');
    expect(within(sheet).getByText(/stops working as soon as you save/i)).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith('/gyms/g1', expect.objectContaining({ theme: 't2', slug: 'ironhouse' }));
    });
  });

  it('refuses a reserved address before calling the API', async () => {
    const patch = vi.spyOn(api, 'patch');
    const user = userEvent.setup();
    renderWithProviders(<GymsPage />);

    await user.click(await screen.findByRole('button', { name: /^edit iron house/i }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('tab', { name: /sign-in link/i }));

    const address = within(sheet).getByLabelText(/sign-in address/i);
    await user.clear(address);
    await user.type(address, 'admin');
    await user.click(within(sheet).getByRole('button', { name: /save changes/i }));

    expect(await within(sheet).findByText(/reserved/i)).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });

  it('creates a gym together with its first administrator', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: { data: { ...gyms[0], id: 'g3', name: 'New Gym' }, admin: { id: 'u9' } },
    });
    const user = userEvent.setup();
    renderWithProviders(<GymsPage />);

    await user.click(await screen.findByRole('button', { name: /add gym/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^gym name/i), 'New Gym');
    await user.type(within(dialog).getByLabelText(/administrator name/i), 'Ravi Kumar');
    await user.type(within(dialog).getByLabelText(/administrator mobile/i), '9811100000');
    await user.type(within(dialog).getByLabelText(/administrator email/i), 'ravi@newgym.com');
    await user.type(within(dialog).getByLabelText(/temporary password/i), 'Newgym123');
    await user.click(within(dialog).getByRole('button', { name: /create gym/i }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/gyms', {
        name: 'New Gym',
        contactEmail: '',
        contactPhone: '',
        slug: 'new-gym',
        theme: 't1',
        admin: { name: 'Ravi Kumar', phone: '9811100000', email: 'ravi@newgym.com', password: 'Newgym123' },
      });
    });

    // The owner's sign-in link is handed over with the credentials.
    expect(await screen.findByText(/new gym is ready/i)).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/iron-house/login`)).toBeInTheDocument();
  });

  it('validates the administrator password before calling the API', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderWithProviders(<GymsPage />);

    await user.click(await screen.findByRole('button', { name: /add gym/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^gym name/i), 'New Gym');
    await user.type(within(dialog).getByLabelText(/administrator name/i), 'Ravi Kumar');
    await user.type(within(dialog).getByLabelText(/administrator mobile/i), '9811100000');
    await user.type(within(dialog).getByLabelText(/administrator email/i), 'ravi@newgym.com');
    await user.type(within(dialog).getByLabelText(/temporary password/i), 'short');
    await user.click(within(dialog).getByRole('button', { name: /create gym/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('asks before suspending, then suspends', async () => {
    const patch = vi
      .spyOn(api, 'patch')
      .mockResolvedValue({ data: { data: { ...gyms[0], isActive: false } } });
    const user = userEvent.setup();
    renderWithProviders(<GymsPage />);

    await user.click(await screen.findByRole('button', { name: /suspend iron house/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/signed out immediately/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /suspend gym/i }));

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith('/gyms/g1/status', { isActive: false });
    });
  });

  it('offers reactivation for a suspended gym', async () => {
    const patch = vi
      .spyOn(api, 'patch')
      .mockResolvedValue({ data: { data: { ...gyms[1], isActive: true } } });
    const user = userEvent.setup();
    renderWithProviders(<GymsPage />);

    await user.click(await screen.findByRole('button', { name: /reactivate pulse fitness/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /reactivate gym/i }));

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith('/gyms/g2/status', { isActive: true });
    });
  });

  it('invites the first gym when there are none', async () => {
    api.get.mockResolvedValue({
      data: { data: [], totals: { gyms: 0, activeGyms: 0, suspendedGyms: 0, members: 0 } },
    });

    renderWithProviders(<GymsPage />);

    expect(await screen.findByText(/no gyms yet/i)).toBeInTheDocument();
  });
});
