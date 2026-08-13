'use client';

import Link from 'next/link';
import { usePolling } from '@/lib/hooks/usePolling';
import { NowPlayingCard } from '@/components/nowplaying/NowPlayingCard';
import { SkipVoteBanner } from '@/components/nowplaying/SkipVoteBanner';
import { QueueList } from '@/components/queue/QueueList';
import { VibeSummary } from '@/components/vibe/VibeSummary';
import type { NowPlayingState, SongRequest } from '@/lib/types';

export default function HomePage() {
  const { data: nowPlaying } = usePolling<NowPlayingState & { state?: string }>(
    () => fetch('/api/spotify/now-playing').then((r) => r.json()),
    3000
  );
  const { data: queueData } = usePolling<{ queue: SongRequest[] }>(
    () => fetch('/api/requests').then((r) => r.json()),
    5000
  );

  const hasNowPlaying = nowPlaying?.state === 'ok' || nowPlaying?.track;

  return (
    <div className="space-y-4">
      <NowPlayingCard data={nowPlaying ?? null} />

      {hasNowPlaying && <SkipVoteBanner />}

      <VibeSummary />

      <Link href="/request" className="btn-primary w-full">
        🔎 Request a song
      </Link>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-mist-300">Up next</h3>
          <Link href="/request" className="text-xs text-dial-violetSoft">
            See full queue →
          </Link>
        </div>
        <QueueList queue={queueData?.queue ?? []} limit={3} />
      </div>
    </div>
  );
}
