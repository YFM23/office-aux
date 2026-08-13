'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Polls `fetcher` every `intervalMs` and exposes the latest result. This is
 * Office Aux's realtime strategy in Demo Mode (no Supabase needed) and a
 * safe fallback in Live Mode. Live Mode should prefer Supabase Realtime
 * channel subscriptions where lower latency matters (queue/vote updates) —
 * see lib/supabase/client.ts — but polling every few seconds is more than
 * fast enough for Now Playing progress, stats, and history.
 */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const result = await fetcherRef.current();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    const id = setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
