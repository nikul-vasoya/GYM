import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
});
