'use client';

import Link from 'next/link';
import { usePolling } from '@/lib/hooks/usePolling';
import type { VibeDefinition, VibeKey } from '@/lib/types';

export function VibeSummary() {
  const { data } = usePolling<{ vibes: VibeDefinition[]; tally: { vibe: VibeKey; percent: number }[]; totalVotes: number }>(
    () => fetch('/api/vibe-votes').then((r) => r.json()),
    6000
  );

  if (!data || data.tally.length === 0) {
    return (
      <Link href="/vibe" className="card block p-4 text-sm text-mist-400">
        No vibe votes yet — tap to set the office mood.
      </Link>
    );
  }

  const top = data.tally[0]!;
  const vibe = data.vibes.find((v) => v.key === top.vibe);

  return (
    <Link href="/vibe" className="card flex items-center justify-between gap-3 p-4 transition hover:bg-white/[0.03]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist-400">Office vibe right now</p>
        <p className="mt-1 font-display text-base font-semibold text-mist-100">
          {vibe?.emoji} {vibe?.label ?? top.vibe}
        </p>
      </div>
      <span className="font-mono text-2xl font-bold text-dial-violetSoft">{top.percent}%</span>
    </Link>
  );
}
