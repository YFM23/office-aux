'use client';

import { useState } from 'react';
import { usePolling } from '@/lib/hooks/usePolling';
import { AlbumArt } from '@/components/nowplaying/AlbumArt';
import { relativeTime } from '@/lib/format';
import type { PlayHistoryEntry } from '@/lib/types';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
] as const;

export default function HistoryPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('today');
  const [requesting, setRequesting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data } = usePolling<{ history: PlayHistoryEntry[] }>(
    () => fetch(`/api/history?range=${range}`).then((r) => r.json()),
    10000,
    [range]
  );

  async function requestAgain(entry: PlayHistoryEntry) {
    setRequesting(entry.id);
    setMessage(null);
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track: entry.track }),
    });
    const body = await res.json();
    setRequesting(null);
    setMessage(res.ok ? `${entry.track.name} is back in the queue.` : body.error ?? 'Could not request that again.');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-mist-100">Music history</h1>
        <p className="text-sm text-mist-400">Everything that's played through the office speakers.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              range === r.key ? 'bg-aux-gradient text-white' : 'border border-white/10 text-mist-400 hover:bg-white/5'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {message && <p className="rounded-xl2 border border-white/10 bg-white/5 px-4 py-2 text-xs text-mist-300">{message}</p>}

      {!data ? (
        <div className="card h-40 animate-pulse" />
      ) : data.history.length === 0 ? (
        <p className="text-sm text-mist-500">Nothing played in this window yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.history.map((entry) => {
            const total = entry.ratingsSummary.love + entry.ratingsSummary.good + entry.ratingsSummary.meh + entry.ratingsSummary.skip;
            const approval = total ? Math.round(((entry.ratingsSummary.love * 100 + entry.ratingsSummary.good * 66 + entry.ratingsSummary.meh * 33) / total)) : null;
            return (
              <li key={entry.id} className="card flex items-center gap-3 p-3">
                <AlbumArt url={entry.track.albumArtUrl} title={entry.track.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-mist-100">{entry.track.name}</p>
                  <p className="truncate text-xs text-mist-400">{entry.track.artists.join(', ')}</p>
                  <p className="mt-0.5 truncate text-[11px] text-mist-500">
                    {relativeTime(entry.playedAt)}
                    {entry.requestedByNickname ? ` · Requested by ${entry.requestedByNickname}` : ' · Auto DJ'}
                    {approval != null ? ` · ${approval}% rating` : ''}
                  </p>
                </div>
                <button
                  onClick={() => requestAgain(entry)}
                  disabled={requesting === entry.id}
                  className="btn-secondary shrink-0 !px-3 !py-2 text-xs disabled:opacity-60"
                >
                  {requesting === entry.id ? 'Adding…' : 'Play again'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
