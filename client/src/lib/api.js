import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'gym.auth.token';

export const getStoredToken = () => window.localStorage.getItem(TOKEN_STORAGE_KEY);
export const setStoredToken = (token) => window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
export const clearStoredToken = () => window.localStorage.removeItem(TOKEN_STORAGE_KEY);

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Read the token per request rather than at module load, so signing in takes
// effect immediately without a page reload.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * A rejected token anywhere in the app means the session is over.
 *
 * Clearing storage and hard-navigating to /login avoids a cascade of failed
 * requests and a half-rendered authenticated shell.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error?.config?.url?.startsWith('/auth/');

    if (error?.response?.status === 401 && !isAuthEndpoint && getStoredToken()) {
      clearStoredToken();
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

/**
 * Turns any axios failure into a plain Error with a message worth showing.
 *
 * Every screen can then do `toast.error(getErrorMessage(error))` without
 * knowing anything about axios or the API envelope.
 */
export const getErrorMessage = (error) => {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
  return error?.message ?? 'Something went wrong';
};

/** Field-level messages from a 400, keyed by field name — `{}` when there are none. */
export const getFieldErrors = (error) => error?.response?.data?.error?.details ?? {};
