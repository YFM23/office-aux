'use client';

import { useState } from 'react';
import { RequestSearch } from '@/components/queue/RequestSearch';
import { QueueList } from '@/components/queue/QueueList';
import { usePolling } from '@/lib/hooks/usePolling';
import type { SongRequest } from '@/lib/types';

export default function RequestPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data } = usePolling<{ queue: SongRequest[] }>(
    () => fetch('/api/requests').then((r) => r.json()),
    4000,
    [refreshKey]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-mist-100">Request a song</h1>
        <p className="text-sm text-mist-400">Search Spotify's catalog and add it to the office queue.</p>
      </div>

      <RequestSearch onRequested={() => setRefreshKey((k) => k + 1)} />

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-mist-300">
          The queue · Office DJ Score
        </h2>
        <p className="mb-3 text-xs text-mist-500">
          Ranked by votes, wait time, and variety — not just whoever asked loudest. Vote a song up to help it climb.
        </p>
        <QueueList queue={data?.queue ?? []} />
      </div>
    </div>
  );
}
