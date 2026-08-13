'use client';

import { useState } from 'react';
import { usePolling } from '@/lib/hooks/usePolling';

export function SkipVoteBanner() {
  const { data } = usePolling(
    () => fetch('/api/skip-votes').then((r) => r.json()),
    4000
  );
  const [voted, setVoted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const state = data?.state as { sessionId: string; votes: number; threshold: number } | null | undefined;
  if (!state) return null;

  async function castVote() {
    const res = await fetch('/api/skip-votes', { method: 'POST' });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? 'Could not cast your vote.');
      return;
    }
    setVoted(true);
  }

  return (
    <div className="card flex items-center justify-between gap-3 p-3">
      <div>
        <p className="text-sm font-medium text-mist-100">Skip this song?</p>
        <p className="font-mono text-xs text-mist-400">
          {state.votes} / {state.threshold} votes required
        </p>
      </div>
      <button
        onClick={castVote}
        disabled={voted}
        className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-50"
      >
        {voted ? 'Voted' : 'Vote to skip'}
      </button>
      {message && <p className="text-xs text-signal-red">{message}</p>}
    </div>
  );
}
