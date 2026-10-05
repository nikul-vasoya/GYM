import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { GymRouteLayout } from './GymRouteLayout';
import { useGymBranding } from './GymBrandingContext';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const MIDCITY = {
  name: 'Mid City',
  slug: 'midcity',
  logoUrl: null,
  theme: { id: 't2', name: 'Ocean Blue', primary: '#2563eb', accent: '#06b6d4' },
};

const Page = () => {
  const branding = useGymBranding();
  const location = useLocation();
  return (
    <>
      <h1>{branding?.name ?? 'No branding'}</h1>
      <p data-testid="path">{location.pathname}</p>
    </>
  );
};

const renderAt = (path) =>
  renderWithProviders(
    <Routes>
      <Route path="/:gymSlug" element={<GymRouteLayout />}>
        <Route path="*" element={<Page />} />
      </Route>
    </Routes>,
    { initialEntries: [path] },
  );

beforeEach(() => {
  vi.restoreAllMocks();
  document.getElementById('gym-theme')?.remove();
});

describe('GymRouteLayout', () => {
  it("paints the page in the gym's theme and shares its branding", async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: MIDCITY } });

    renderAt('/midcity/login');

    expect(await screen.findByRole('heading', { name: 'Mid City' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/public/gyms/midcity');

    const style = document.getElementById('gym-theme');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain(':root{--');
    expect(style.textContent).toContain(':root.dark{--');
  });

  it('shows "gym not found" for an address no gym answers to', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ response: { status: 404 } });

    renderAt('/nowhere/login');

    expect(await screen.findByText(/there is no gym at this address/i)).toBeInTheDocument();
    expect(document.getElementById('gym-theme')).toBeNull();
  });

  it("moves a signed-in account from another gym's address to its own", async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/auth/me') {
        return {
          data: {
            user: { id: '1', name: 'Owner', email: 'o@midcity.com', role: 'admin' },
            gym: { id: 'g1', ...MIDCITY },
          },
        };
      }
      return { data: { data: MIDCITY } };
    });

    renderAt('/iron-house/members/42');

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/midcity/members/42');
    });
    // The other gym's branding is never requested.
    expect(api.get).not.toHaveBeenCalledWith('/public/gyms/iron-house');
  });
});
