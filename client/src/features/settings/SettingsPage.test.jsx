import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/renderWithProviders';
import { SettingsPage } from './SettingsPage';
import { api } from '@/lib/api';

const packages = [
  { id: 'p1', name: '1 Month', durationMonths: 1, price: 1500, isActive: true },
  { id: 'p3', name: '3 Months', durationMonths: 3, price: 4000, isActive: true },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: packages } });
});

describe('SettingsPage', () => {
  it('lists every package with its duration and price', async () => {
    renderWithProviders(<SettingsPage />);

    expect(await screen.findByText('1 Month')).toBeInTheDocument();
    expect(screen.getByText('3 Months')).toBeInTheDocument();
    expect(screen.getByLabelText('Price for 1 Month')).toHaveValue(1500);
  });

  it('includes retired packages so they can be brought back', async () => {
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/packages?includeInactive=true');
    });
  });

  it('saves an edited price', async () => {
    const patch = vi
      .spyOn(api, 'patch')
      .mockResolvedValue({ data: { data: { ...packages[0], price: 1800 } } });
    const user = userEvent.setup();

    renderWithProviders(<SettingsPage />);

    const input = await screen.findByLabelText('Price for 1 Month');
    await user.clear(input);
    await user.type(input, '1800');
    await user.click(screen.getByRole('button', { name: /save 1 month/i }));

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith('/packages/p1', { price: 1800 });
    });
  });

  it('rejects a negative price without calling the API', async () => {
    const patch = vi.spyOn(api, 'patch');
    const user = userEvent.setup();

    renderWithProviders(<SettingsPage />);

    const input = await screen.findByLabelText('Price for 1 Month');
    await user.clear(input);
    await user.type(input, '-5');
    await user.click(screen.getByRole('button', { name: /save 1 month/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot be negative/i);
    expect(patch).not.toHaveBeenCalled();
  });

  it('explains that price changes do not affect existing members', async () => {
    renderWithProviders(<SettingsPage />);

    expect(
      await screen.findByText(/existing members keep the price they were charged/i),
    ).toBeInTheDocument();
  });

  it('adds a new plan', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: { data: { id: 'p9', name: 'Summer Special', durationMonths: 2, price: 2500, isActive: true } },
    });
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await user.click(await screen.findByRole('button', { name: /new plan/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/plan name/i), 'Summer Special');
    const months = within(dialog).getByLabelText(/duration/i);
    await user.clear(months);
    await user.type(months, '2');
    await user.type(within(dialog).getByLabelText(/^price/i), '2500');
    await user.click(within(dialog).getByRole('button', { name: /add plan/i }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/packages', {
        name: 'Summer Special',
        durationMonths: 2,
        price: 2500,
        description: '',
        isActive: true,
      });
    });
  });

  it('switches a plan off', async () => {
    const patch = vi
      .spyOn(api, 'patch')
      .mockResolvedValue({ data: { data: { ...packages[0], isActive: false } } });
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    const toggle = await screen.findByRole('switch', { name: /1 month available to sell/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/packages/p1', { isActive: false }));
  });

  it('asks before deleting a plan', async () => {
    const remove = vi.spyOn(api, 'delete').mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await user.click(await screen.findByRole('button', { name: /delete 1 month/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete plan/i }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('/packages/p1'));
  });
});
