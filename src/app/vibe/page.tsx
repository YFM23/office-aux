'use client';

import { useEffect, useState } from 'react';
import { usePolling } from '@/lib/hooks/usePolling';
import type { VibeDefinition, VibeKey } from '@/lib/types';

export default function VibePage() {
  const { data, refetch } = usePollingWithRefetch();
  const [myVote, setMyVote] = useState<VibeKey | null>(null);
  const [voting, setVoting] = useState<VibeKey | null>(null);

  useEffect(() => {
    setMyVote((localStorage.getItem('officeAux:vibeVote') as VibeKey) ?? null);
  }, []);

  async function castVote(vibe: VibeKey) {
    setVoting(vibe);
    const res = await fetch('/api/vibe-votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibe }),
    });
    setVoting(null);
    if (res.ok) {
      localStorage.setItem('officeAux:vibeVote', vibe);
      setMyVote(vibe);
      refetch();
    }
  }

  const vibes: VibeDefinition[] = data?.vibes ?? [];
  const tally = new Map((data?.tally ?? []).map((t: { vibe: VibeKey; percent: number }) => [t.vibe, t.percent]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-mist-100">What's the vibe?</h1>
        <p className="text-sm text-mist-400">
          One active vote each. The winning vibe steers Auto DJ when the request queue is empty — it won't interrupt what's playing now.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {vibes.filter((v) => v.active).map((vibe) => {
          const percent = tally.get(vibe.key) ?? 0;
          const isMine = myVote === vibe.key;
          return (
            <button
              key={vibe.key}
              onClick={() => castVote(vibe.key)}
              disabled={voting === vibe.key}
              className={`card relative overflow-hidden p-4 text-left transition active:scale-[0.98] ${
                isMine ? 'border-dial-violet' : ''
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-dial-violet/10 transition-all"
                style={{ width: `${percent}%` }}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{vibe.emoji}</span>
                  {isMine && <span className="text-xs text-dial-violetSoft">your vote</span>}
                </div>
                <p className="mt-2 font-display text-sm font-semibold text-mist-100">{vibe.label}</p>
                <p className="font-mono text-lg font-bold text-mist-200">{percent}%</p>
              </div>
            </button>
          );
        })}
      </div>

      {(data?.totalVotes ?? 0) === 0 && (
        <p className="text-center text-sm text-mist-500">No votes yet — be the first to set the office mood.</p>
      )}
    </div>
  );
}

function usePollingWithRefetch() {
  const result = usePolling<{ vibes: VibeDefinition[]; tally: { vibe: VibeKey; percent: number }[]; totalVotes: number }>(
    () => fetch('/api/vibe-votes').then((r) => r.json()),
    5000
  );
  return { ...result, refetch: () => {} }; // polling already refreshes within 5s; explicit refetch kept for clarity/extension
}
