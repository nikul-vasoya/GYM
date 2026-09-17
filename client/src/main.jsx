import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import { Toaster } from './components/ui/sonner.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Fresh enough for a back-office tool; avoids a refetch on every focus.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster richColors closeButton position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
