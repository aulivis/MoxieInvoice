'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseSettingsFetchOptions {
  cache?: RequestCache;
}

/**
 * Fetches JSON from a URL once on mount. Use for settings forms that need initial data.
 * Returns data, fetched flag, error, and refetch.
 */
export function useSettingsFetch<T>(
  url: string,
  options: UseSettingsFetchOptions = {}
): { data: T | null; fetched: boolean; error: Error | null; refetch: () => void } {
  const { cache = 'no-store' } = options;
  const [data, setData] = useState<T | null>(null);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);

  const doFetch = useCallback(() => {
    setError(null);
    fetch(url, { cache })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        setData(d as T);
        setFetched(true);
      })
      .catch((e) => {
        setFetched(true);
        setError(e instanceof Error ? e : new Error(String(e)));
      });
  }, [url, cache]);

  useEffect(() => {
    doFetch();
  }, [doFetch, refetchCounter]);

  const refetch = useCallback(() => {
    setRefetchCounter((c) => c + 1);
  }, []);

  return { data, fetched, error, refetch };
}
