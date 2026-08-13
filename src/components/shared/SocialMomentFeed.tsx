'use client';

import { useEffect, useRef, useState } from 'react';
import type { SocialMoment } from '@/lib/types';

/**
 * Polls for new social moments and shows the newest one briefly at the top
 * of the screen. Deliberately understated per the spec ("keep these subtle
 * and not distracting") — one line, auto-dismisses, never stacks more than
 * one at a time.
 */
export function SocialMomentFeed() {
  const [visible, setVisible] = useState<SocialMoment | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/social-moments');
        const data = await res.json();
        const moments: SocialMoment[] = data.moments ?? [];
        if (cancelled) return;

        if (isFirstLoad.current) {
          moments.forEach((m) => seenIds.current.add(m.id));
          isFirstLoad.current = false;
          return;
        }

        const fresh = moments.find((m) => !seenIds.current.has(m.id));
        if (fresh) {
          seenIds.current.add(fresh.id);
          setVisible(fresh);
          setTimeout(() => setVisible((v) => (v?.id === fresh.id ? null : v)), 4500);
        }
      } catch {
        /* ignore transient network errors */
      }
    }
    poll();
    const id = setInterval(poll, 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-4">
      <div className="animate-rise pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-ink-850/95 px-4 py-2 text-xs text-mist-200 shadow-card backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
        {visible.text}
      </div>
    </div>
  );
}
