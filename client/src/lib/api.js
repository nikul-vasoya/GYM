import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'gym.auth.token';
export const SCOPE_STORAGE_KEY = 'gym.auth.scope';
export const GYM_SLUG_STORAGE_KEY = 'gym.auth.gymSlug';

export const getStoredToken = () => window.localStorage.getItem(TOKEN_STORAGE_KEY);
export const setStoredToken = (token) => window.localStorage.setItem(TOKEN_STORAGE_KEY, token);

/**
 * Which sign-in screen this session came from.
 *
 * Remembered so an expired session sends the platform operator back to
 * /admin-login rather than to the gym sign-in page they have never used.
 */
export const getStoredScope = () => window.localStorage.getItem(SCOPE_STORAGE_KEY) ?? 'gym';
export const setStoredScope = (scope) => window.localStorage.setItem(SCOPE_STORAGE_KEY, scope);

/**
 * The address of the gym this session belongs to, so an expired session
 * returns staff to their own gym's branded sign-in page.
 */
export const getStoredGymSlug = () => window.localStorage.getItem(GYM_SLUG_STORAGE_KEY);
export const setStoredGymSlug = (slug) => {
  if (slug) window.localStorage.setItem(GYM_SLUG_STORAGE_KEY, slug);
  else window.localStorage.removeItem(GYM_SLUG_STORAGE_KEY);
};

/** The sign-in screen for the session that just ended. */
export const signInPathForScope = (scope = getStoredScope(), gymSlug = getStoredGymSlug()) => {
  if (scope === 'platform') return '/admin-login';
  return gymSlug ? `/${gymSlug}/login` : '/login';
};

export const clearStoredToken = () => {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SCOPE_STORAGE_KEY);
  window.localStorage.removeItem(GYM_SLUG_STORAGE_KEY);
};

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
 * Clearing storage and hard-navigating to the sign-in page avoids a cascade of failed
 * requests and a half-rendered authenticated shell.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error?.config?.url?.startsWith('/auth/');

    if (error?.response?.status === 401 && !isAuthEndpoint && getStoredToken()) {
      const destination = signInPathForScope();
      clearStoredToken();
      window.location.assign(destination);
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

  // The API answers every failure with { error: { message } }, so a 5xx
  // without one did not come from the API at all. In development that is the
  // Vite proxy reporting that nothing is listening on the API port — say so,
  // rather than passing on axios's "Request failed with status code 500".
  if (error?.response?.status >= 500) {
    return 'Cannot reach the API server. Make sure it is running (npm run dev).';
  }

  return error?.message ?? 'Something went wrong';
};

/** Field-level messages from a 400, keyed by field name — `{}` when there are none. */
export const getFieldErrors = (error) => error?.response?.data?.error?.details ?? {};
