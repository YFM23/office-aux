'use client';

import { useEffect, useState } from 'react';
import type { RatingValue } from '@/lib/types';

const OPTIONS: { value: RatingValue; emoji: string; label: string }[] = [
  { value: 'love', emoji: '❤️', label: 'Love it' },
  { value: 'good', emoji: '👍', label: 'Good' },
  { value: 'meh', emoji: '😐', label: 'Meh' },
  { value: 'skip', emoji: '👎', label: 'Skip please' },
];

/**
 * One rating per person per currently-playing track — enforced server-side
 * (see /api/ratings + the `unique(session_id, user_id)` constraint in Live
 * mode), and mirrored here in localStorage purely so the buttons grey out
 * immediately instead of round-tripping to find out you already voted.
 */
export function RatingButtons({ trackKey }: { trackKey: string }) {
  const [rated, setRated] = useState<RatingValue | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`officeAux:rated:${trackKey}`);
    setRated((stored as RatingValue) ?? null);
    setMessage(null);
  }, [trackKey]);

  async function rate(value: RatingValue) {
    if (rated || pending) return;
    setPending(true);
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setMessage(data.error ?? 'Could not save your rating.');
      return;
    }
    localStorage.setItem(`officeAux:rated:${trackKey}`, value);
    setRated(value);
    if (value === 'skip') setMessage('Counted as a vote to skip too.');
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => rate(opt.value)}
            disabled={Boolean(rated) || pending}
            className={`flex flex-col items-center gap-1 rounded-xl2 border px-2 py-3 text-xs font-medium transition ${
              rated === opt.value
                ? 'border-dial-violet bg-dial-violet/20 text-mist-100'
                : rated
                ? 'border-white/5 bg-white/[0.03] text-mist-400/50'
                : 'border-white/10 bg-white/5 text-mist-300 hover:bg-white/10 active:scale-95'
            }`}
          >
            <span className="text-xl">{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>
      {message && <p className="mt-2 text-center text-xs text-mist-400">{message}</p>}
    </div>
  );
}
