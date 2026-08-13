'use client';

import { useEffect, useState } from 'react';
import { AlbumArt } from '../nowplaying/AlbumArt';
import type { Track } from '@/lib/types';

export function RequestSearch({ onRequested }: { onRequested?: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.tracks ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  async function request(track: Track) {
    setRequestingId(track.spotifyId);
    setMessage(null);
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track }),
    });
    const data = await res.json();
    setRequestingId(null);
    if (!res.ok) {
      setMessage({ tone: 'error', text: data.error ?? 'Could not add that request.' });
      return;
    }
    setMessage({ tone: 'success', text: `${track.name} is in the queue 🎉` });
    onRequested?.();
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a song or artist…"
          className="w-full rounded-xl2 border border-white/10 bg-ink-900 px-4 py-3 text-mist-100 placeholder:text-mist-400/60 focus:border-dial-violet focus:outline-none"
        />
        {loading && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-mist-400">Searching…</span>}
      </div>

      {message && (
        <p className={`rounded-xl2 border px-4 py-3 text-sm ${message.tone === 'error' ? 'border-signal-red/30 bg-signal-red/10 text-signal-red' : 'border-signal-green/30 bg-signal-green/10 text-signal-green'}`}>
          {message.text}
        </p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((track) => (
            <li key={track.spotifyId} className="card flex items-center gap-3 p-3">
              <AlbumArt url={track.albumArtUrl} title={track.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-mist-100">
                  {track.name} {track.explicit && <span className="pill ml-1 !py-0 !px-1.5 text-[10px]">E</span>}
                </p>
                <p className="truncate text-xs text-mist-400">
                  {track.artists.join(', ')} · {track.albumName}
                </p>
              </div>
              <button
                onClick={() => request(track)}
                disabled={requestingId === track.spotifyId}
                className="btn-secondary shrink-0 !px-3 !py-2 text-xs disabled:opacity-60"
              >
                {requestingId === track.spotifyId ? 'Adding…' : 'Request'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <p className="px-2 text-sm text-mist-400">No results for "{query}" — Spotify search caps at 10 results, try being more specific.</p>
      )}
    </div>
  );
}
