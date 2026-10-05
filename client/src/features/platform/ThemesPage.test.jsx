import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ThemesPage } from './ThemesPage';
import { api } from '@/lib/api';

const themes = [
  { id: 't1', key: 'aura-gold', name: 'Aura Gold', primary: '#c9a227', accent: '#8c6a1c', isSystem: true, gymCount: 3 },
  { id: 'c1', key: null, name: 'Mid City Navy', primary: '#1e3a8a', accent: null, isSystem: false, gymCount: 1 },
  { id: 'c2', key: null, name: 'Unused', primary: '#111111', accent: null, isSystem: false, gymCount: 0 },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: themes } });
});

describe('ThemesPage', () => {
  it('separates custom themes from the read-only built-in ones', async () => {
    renderWithProviders(<ThemesPage />);

    expect(await screen.findByText('Mid City Navy')).toBeInTheDocument();
    expect(screen.getByText('Built-in')).toBeInTheDocument();
    expect(screen.getByText('Used by 3 gyms')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit aura gold/i })).not.toBeInTheDocument();
  });

  it('will not delete a theme a gym is wearing', async () => {
    renderWithProviders(<ThemesPage />);

    expect(await screen.findByRole('button', { name: /delete mid city navy/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete unused/i })).toBeEnabled();
  });

  it('creates a theme from a name and a colour', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: { data: { id: 'c3', name: 'Volt', primary: '#123456', accent: null, isSystem: false, gymCount: 0 } },
    });
    const user = userEvent.setup();
    renderWithProviders(<ThemesPage />);

    await user.click(await screen.findByRole('button', { name: /new theme/i }));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText(/theme name/i), 'Volt');
    const primary = within(dialog).getByLabelText(/^primary colour/i, { selector: 'input[type="text"], input:not([type])' });
    await user.clear(primary);
    await user.type(primary, '#123456');
    await user.click(within(dialog).getByRole('button', { name: /create theme/i }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/themes', { name: 'Volt', primary: '#123456', accent: null });
    });
  });
});
