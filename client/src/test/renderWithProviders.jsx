import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/features/auth/AuthContext.jsx';

/**
 * Renders a component inside the same providers the real app uses.
 *
 * Retries are off so a deliberately-failing request fails immediately rather
 * than making the test wait through three attempts.
 */
export const renderWithProviders = (ui, { initialEntries = ['/'] } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
};
