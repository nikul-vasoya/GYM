import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import {
  api,
  getStoredToken,
  setStoredToken,
  setStoredScope,
  setStoredGymSlug,
  clearStoredToken,
} from '@/lib/api';

export const AuthContext = createContext(null);

/**
 * Holds the signed-in user for the whole app.
 *
 * On mount it revalidates any stored token against `/auth/me`, so a token that
 * has expired or whose account was deleted fails on load rather than on the
 * first action the user takes.
 *
 * The response also carries the gym the account belongs to — null for the
 * platform operator, who belongs to none.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [gym, setGym] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    if (!getStoredToken()) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    api
      .get('/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        setUser(data.user);
        setGym(data.gym ?? null);
        setStoredGymSlug(data.gym?.slug);
      })
      .catch(() => {
        clearStoredToken();
        if (!cancelled) {
          setUser(null);
          setGym(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * `scope` names which door the credentials came through. The server refuses
   * a gym account on the platform door and vice versa, so a mistyped URL
   * cannot land someone in the wrong half of the product.
   */
  /*
   * `gymSlug` is set when signing in at a gym's own address. The server then
   * refuses an account from any other gym, exactly as it refuses a wrong
   * password.
   */
  const login = useCallback(async ({ identifier, email, password, scope = 'gym', gymSlug }) => {
    const { data } = await api.post('/auth/login', {
      // A mobile number or an email; the platform page still sends `email`.
      identifier: identifier ?? email,
      password,
      scope,
      ...(gymSlug ? { gymSlug } : {}),
    });

    setStoredToken(data.token);
    setStoredScope(scope);
    setStoredGymSlug(data.gym?.slug);
    setUser(data.user);
    setGym(data.gym ?? null);

    return { user: data.user, gym: data.gym ?? null };
  }, []);

  /** Replaces the cached gym, e.g. after its branding changed. */
  const updateGym = useCallback((next) => {
    setGym(next);
    setStoredGymSlug(next?.slug);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setGym(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      gym,
      isLoading,
      isAuthenticated: Boolean(user),
      /** The platform operator: gyms administration, no gym data of their own. */
      isPlatformAdmin: user?.role === 'superadmin',
      /** A gym's own administrator: staff accounts and package prices (M3). */
      isGymAdmin: user?.role === 'admin',
      login,
      logout,
      updateGym,
    }),
    [user, gym, isLoading, login, logout, updateGym],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
