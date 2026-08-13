'use client';

import { useState } from 'react';
import { AlbumArt } from '../nowplaying/AlbumArt';
import type { SongRequest } from '@/lib/types';
import { relativeTime } from '@/lib/format';

export function QueueList({ queue, limit, showVoting = true }: { queue: SongRequest[]; limit?: number; showVoting?: boolean }) {
  const items = limit ? queue.slice(0, limit) : queue;

  if (items.length === 0) {
    return (
      <div className="card px-4 py-8 text-center">
        <p className="text-sm text-mist-400">Queue's empty — Auto DJ is picking up the slack until someone requests a song.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((req, i) => (
        <QueueRow key={req.id} request={req} position={i + 1} showVoting={showVoting} />
      ))}
    </ul>
  );
}

function QueueRow({ request, position, showVoting }: { request: SongRequest; position: number; showVoting: boolean }) {
  const [localVotes, setLocalVotes] = useState(request.votes);
  const [myVote, setMyVote] = useState<1 | -1 | 0>(0);
  const [busy, setBusy] = useState(false);

  async function vote(value: 1 | -1) {
    if (busy) return;
    setBusy(true);
    const nextVote = myVote === value ? 0 : value;
    const delta = nextVote - myVote;
    setLocalVotes((v) => v + delta);
    setMyVote(nextVote);
    await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id, value: nextVote === 0 ? value : nextVote }),
    }).catch(() => {});
    setBusy(false);
  }

  return (
    <li className="card flex items-center gap-3 p-3">
      <span className="w-4 shrink-0 text-center font-mono text-xs text-mist-400">{position}</span>
      <AlbumArt url={request.track.albumArtUrl} title={request.track.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-mist-100">{request.track.name}</p>
        <p className="truncate text-xs text-mist-400">{request.track.artists.join(', ')}</p>
        <p className="mt-0.5 truncate text-[11px] text-mist-500">
          Requested by {request.requestedByNickname} · {relativeTime(request.createdAt)}
        </p>
      </div>
      {showVoting && (
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            onClick={() => vote(1)}
            className={`rounded-md px-1.5 py-0.5 text-sm transition ${myVote === 1 ? 'text-signal-green' : 'text-mist-400 hover:text-mist-200'}`}
          >
            ⬆️
          </button>
          <span className="font-mono text-xs text-mist-300">{localVotes}</span>
          <button
            onClick={() => vote(-1)}
            className={`rounded-md px-1.5 py-0.5 text-sm transition ${myVote === -1 ? 'text-signal-red' : 'text-mist-400 hover:text-mist-200'}`}
          >
            ⬇️
          </button>
        </div>
      )}
    </li>
  );
}
