import { useCallback, useState } from 'react';
import { ApiError, request } from '../api/client.js';
import { routes } from '../api/routes.js';
import { useApi } from './useApi.js';

const storageKey = 'gc_access_token';

function readToken() {
  try {
    return window.sessionStorage.getItem(storageKey) || null;
  } catch {
    return null;
  }
}

function storeToken(token) {
  try {
    if (token) window.sessionStorage.setItem(storageKey, token);
    else window.sessionStorage.removeItem(storageKey);
  } catch {
    // Sign-in still works in memory when session storage is unavailable.
  }
}

export function useSession() {
  const [token, setToken] = useState(readToken);
  const signOut = useCallback(() => {
    storeToken(null);
    setToken(null);
  }, []);
  const account = useApi(token ? routes.account.me : null, { token, onUnauthorized: signOut });
  const profile = useApi(token ? routes.player.me : null, { token, onUnauthorized: signOut });

  const signIn = async (credentials, signal) => {
    const data = await request(routes.account.login, {
      method: 'POST', body: credentials, signal,
    });
    if (!data.access_token) throw new ApiError('Masuk gagal. Silakan coba lagi.', 0);
    storeToken(data.access_token);
    setToken(data.access_token);
  };

  return { token, account, profile, signIn, signOut };
}
