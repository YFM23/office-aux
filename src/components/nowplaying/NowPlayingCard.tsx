'use client';

import { useEffect, useState } from 'react';
import { AlbumArt } from './AlbumArt';
import { RatingButtons } from './RatingButtons';
import { formatMs } from '@/lib/format';
import type { NowPlayingState } from '@/lib/types';

interface Props {
  data: (NowPlayingState & { state?: string; demoMode?: boolean }) | null;
}

export function NowPlayingCard({ data }: Props) {
  // Interpolate progress client-side between polls so the bar feels
  // continuous instead of stepping every few seconds.
  const [displayProgress, setDisplayProgress] = useState(data?.progressMs ?? 0);

  useEffect(() => {
    setDisplayProgress(data?.progressMs ?? 0);
    if (!data?.isPlaying) return;
    const start = Date.now();
    const base = data?.progressMs ?? 0;
    const id = setInterval(() => setDisplayProgress(base + (Date.now() - start)), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.track?.spotifyId, data?.progressMs, data?.isPlaying]);

  if (!data || data.state === 'disconnected') {
    return (
      <EmptyState
        emoji="🔌"
        title="Spotify isn't connected yet"
        body="Ask your admin to connect Spotify from the Admin panel to start real office playback."
      />
    );
  }
  if (data.state === 'no_device') {
    return <EmptyState emoji="🔈" title="No active Spotify device" body="Open Spotify on the office speakers, then pick it in Admin → Devices." />;
  }
  if (data.state === 'rate_limited') {
    return <EmptyState emoji="⏳" title="Catching up with Spotify" body="We're being rate-limited for a moment — this refreshes automatically." />;
  }
  if (data.state === 'token_expired') {
    return <EmptyState emoji="🔑" title="Spotify session expired" body="Ask your admin to reconnect Spotify from the Admin panel." />;
  }
  if (!data.track) {
    return <EmptyState emoji="🎶" title="Queue's empty" body="Be the first to request something from the Request tab." />;
  }

  const { track } = data;
  const progressPct = Math.min(100, (displayProgress / track.durationMs) * 100);

  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-square w-full">
        <div className="groove-ring absolute inset-0 opacity-20" />
        <div className="absolute inset-3">
          <AlbumArt url={track.albumArtUrl} title={track.name} size="lg" />
        </div>
        {!data.isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="pill !bg-ink-900/80 !text-mist-100">⏸ Paused</span>
          </div>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-mist-400">Now Playing</p>
          <h2 className="truncate font-display text-xl font-bold text-mist-100">{track.name}</h2>
          <p className="truncate text-sm text-mist-300">{track.artists.join(', ')}</p>
        </div>

        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-aux-gradient transition-[width]" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[11px] text-mist-400">
            <span>{formatMs(displayProgress)}</span>
            <span>-{formatMs(Math.max(0, track.durationMs - displayProgress))}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.requestedByNickname && <span className="pill">🎧 Requested by {data.requestedByNickname}</span>}
          {data.officeRating != null && <span className="pill">🔥 Office rating {Math.round(data.officeRating)}%</span>}
          {track.explicit && <span className="pill">E</span>}
        </div>

        <RatingButtons trackKey={data.sessionId ?? track.spotifyId} />
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="text-4xl">{emoji}</span>
      <h2 className="font-display text-lg font-semibold text-mist-100">{title}</h2>
      <p className="max-w-xs text-sm text-mist-400">{body}</p>
    </div>
  );
}
