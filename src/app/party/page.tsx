'use client';

import { useEffect, useState } from 'react';
import { usePolling } from '@/lib/hooks/usePolling';
import { AlbumArt } from '@/components/nowplaying/AlbumArt';
import { Wordmark } from '@/components/shared/Wordmark';
import { formatMs } from '@/lib/format';
import type { NowPlayingState, SongRequest } from '@/lib/types';

/**
 * Full-screen "Now Playing" display meant for an office TV or monitor near
 * the speakers. This is also the page that drives LIVE-mode playback
 * transitions by polling /api/queue/tick — see that route's comment block
 * for why a poller (this page, likely open all day) or a Vercel Cron Job is
 * required rather than a purely event-driven approach.
 */
export default function PartyModePage() {
  const [joinUrl, setJoinUrl] = useState('');
  useEffect(() => setJoinUrl(window.location.origin), []);

  const { data: nowPlaying } = usePolling<NowPlayingState & { state?: string }>(
    () => fetch('/api/spotify/now-playing').then((r) => r.json()),
    3000
  );
  const { data: queueData } = usePolling<{ queue: SongRequest[] }>(
    () => fetch('/api/requests').then((r) => r.json()),
    5000
  );

  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/queue/tick', { method: 'POST' }).catch(() => {});
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const track = nowPlaying?.track;
  const progressPct = track ? Math.min(100, ((nowPlaying?.progressMs ?? 0) / track.durationMs) * 100) : 0;

  return (
    <div className="grid min-h-screen grid-cols-1 gap-8 bg-ink-950 p-10 lg:grid-cols-[1.3fr_1fr]">
      <div className="pointer-events-none fixed inset-0 bg-dial-glow" />

      <div className="relative flex flex-col justify-center">
        <Wordmark size="lg" />
        {track ? (
          <div className="mt-10 flex items-center gap-10">
            <div className="relative h-72 w-72 shrink-0">
              <div className="groove-ring absolute -inset-4 rounded-full opacity-30 blur-xl" />
              <AlbumArt url={track.albumArtUrl} title={track.name} size="lg" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-mist-400">Now Playing</p>
              <h1 className="mt-2 truncate font-display text-5xl font-bold text-mist-100">{track.name}</h1>
              <p className="mt-2 truncate text-2xl text-mist-300">{track.artists.join(', ')}</p>
              {nowPlaying?.requestedByNickname && (
                <p className="mt-4 pill !text-sm">🎧 Requested by {nowPlaying.requestedByNickname}</p>
              )}
              <div className="mt-8 h-2 w-full max-w-lg overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-aux-gradient" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="mt-2 font-mono text-sm text-mist-400">
                {formatMs(nowPlaying?.progressMs ?? 0)} / {formatMs(track.durationMs)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-10 text-2xl text-mist-400">Nothing playing yet — request a song to get started.</p>
        )}
      </div>

      <div className="relative flex flex-col justify-center gap-8">
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold uppercase tracking-wide text-mist-300">Up next</h2>
          <div className="space-y-3">
            {(queueData?.queue ?? []).slice(0, 3).map((req, i) => (
              <div key={req.id} className="card flex items-center gap-4 p-4">
                <span className="font-mono text-lg text-mist-500">{i + 1}</span>
                <AlbumArt url={req.track.albumArtUrl} title={req.track.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-mist-100">{req.track.name}</p>
                  <p className="truncate text-sm text-mist-400">{req.track.artists.join(', ')}</p>
                </div>
                <span className="pill">⬆️ {req.votes}</span>
              </div>
            ))}
            {(queueData?.queue.length ?? 0) === 0 && <p className="text-sm text-mist-500">Queue's empty — Auto DJ has it covered.</p>}
          </div>
        </div>

        <div className="card flex items-center gap-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/qrcode?url=${encodeURIComponent(joinUrl)}`} alt="Join QR code" className="h-24 w-24 rounded-lg bg-white p-2" />
          <div>
            <p className="font-display text-sm font-semibold text-mist-100">Join the office jukebox</p>
            <p className="text-xs text-mist-500">Scan to request a song — no Spotify login needed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
