import { useEffect, useState } from 'react';
import { request } from '../api/client.js';

export function useApi(path, { token, onUnauthorized } = {}) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const key = JSON.stringify([path, token, revision]);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let active = true;
    request(path, { token, signal: controller.signal }).then(
      (data) => {
        if (active) setResult({ key, data, error: null });
      },
      (error) => {
        if (!active || error.name === 'AbortError') return;
        if (error.status === 401) onUnauthorized?.();
        setResult({ key, data: null, error });
      },
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, token, key, onUnauthorized]);

  const current = result?.key === key ? result : null;
  return {
    data: path ? current?.data ?? null : null,
    error: path ? current?.error ?? null : null,
    loading: Boolean(path && !current),
    retry: () => setRevision((value) => value + 1),
  };
}
