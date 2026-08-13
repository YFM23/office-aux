'use client';

import Link from 'next/link';
import { usePolling } from '@/lib/hooks/usePolling';
import type { LeaderboardCategory } from '@/lib/types';

export default function LeaderboardPage() {
  const { data } = usePolling<{ categories: LeaderboardCategory[] }>(
    () => fetch('/api/leaderboard').then((r) => r.json()),
    10000
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-mist-100">Team leaderboard</h1>
        <p className="text-sm text-mist-400">All computed from real requests and ratings — never random.</p>
      </div>

      {!data ? (
        <div className="card h-40 animate-pulse" />
      ) : (
        <div className="space-y-4">
          {data.categories.map((cat) => (
            <div key={cat.key} className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-display text-sm font-semibold text-mist-100">
                    {cat.emoji} {cat.title}
                  </p>
                  <p className="text-xs text-mist-500">{cat.description}</p>
                </div>
              </div>
              {cat.entries.length === 0 ? (
                <p className="text-xs text-mist-500">Not enough data yet.</p>
              ) : (
                <ol className="space-y-2">
                  {cat.entries.map((entry, i) => (
                    <li key={entry.userId} className="flex items-center gap-3">
                      <span className="w-4 text-center font-mono text-xs text-mist-500">{i + 1}</span>
                      <span className="text-lg">{entry.avatarEmoji}</span>
                      <Link href={`/profile/${entry.userId}`} className="flex-1 truncate text-sm text-mist-200 hover:text-mist-100">
                        {entry.nickname}
                      </Link>
                      <span className="font-mono text-xs text-mist-400">{entry.label}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
