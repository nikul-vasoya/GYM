import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { api, getStoredToken, setStoredToken, clearStoredToken } from '@/lib/api';

export const AuthContext = createContext(null);

/**
 * Holds the signed-in user for the whole app.
 *
 * On mount it revalidates any stored token against `/auth/me`, so a token that
 * has expired or whose account was deleted fails on load rather than on the
 * first action the user takes.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        clearStoredToken();
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    setStoredToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: Boolean(user), login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
