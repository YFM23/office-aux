'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePolling } from '@/lib/hooks/usePolling';
import { BarChart } from '@/components/stats/BarChart';
import type { OfficeStatsSnapshot } from '@/lib/types';

const RANGES: { key: OfficeStatsSnapshot['range']; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All time' },
];

export default function StatsPage() {
  const [range, setRange] = useState<OfficeStatsSnapshot['range']>('today');
  const { data } = usePolling<{ stats: OfficeStatsSnapshot }>(
    () => fetch(`/api/stats?range=${range}`).then((r) => r.json()),
    8000,
    [range]
  );
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-mist-100">Office music stats</h1>
          <p className="text-sm text-mist-400">What the whole office has been playing.</p>
        </div>
        <Link href="/leaderboard" className="pill hover:bg-white/10">
          🏆 Leaderboard →
        </Link>
      </div>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              range === r.key ? 'bg-aux-gradient text-white' : 'border border-white/10 text-mist-400 hover:bg-white/5'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!stats ? (
        <div className="card h-40 animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Songs played" value={stats.songsPlayed} />
            <StatTile label="Songs requested" value={stats.songsRequested} />
            <StatTile label="Average rating" value={`${stats.averageRating}%`} />
            <StatTile label="Most active DJ" value={stats.mostActiveDjNickname ?? '—'} />
            <StatTile label="Top artist" value={stats.mostPopularArtist ?? '—'} />
            <StatTile label="Top genre" value={stats.mostPopularGenre ?? '—'} />
            <StatTile label="Dominant vibe" value={stats.dominantVibe ?? '—'} />
            <StatTile label="Most skipped artist" value={stats.mostSkippedArtist ?? '—'} />
          </div>

          {stats.topRatedSongToday && (
            <div className="card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist-400">Top-rated song</p>
              <p className="mt-1 font-display text-base font-semibold text-mist-100">{stats.topRatedSongToday.name}</p>
              <p className="text-xs text-mist-400">{stats.topRatedSongToday.artist}</p>
            </div>
          )}

          {stats.genreBreakdown.length > 0 && (
            <div className="card p-4">
              <p className="mb-3 font-display text-sm font-semibold text-mist-100">Genre breakdown</p>
              <BarChart data={stats.genreBreakdown.map((g) => ({ label: g.genre, value: g.percent }))} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist-400">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-bold text-mist-100">{value}</p>
    </div>
  );
}
