import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import { buildSoundProfile } from '@/lib/algorithms/soundProfile';
import { buildLeaderboard } from '@/lib/algorithms/leaderboard';
import { rowToHistoryEntry, rowToUser } from '@/lib/supabase/mappers';
import type { PlayHistoryEntry, UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const userId = params.id;

  let user: UserProfile | null;
  let allUsers: UserProfile[];
  let allHistory: PlayHistoryEntry[];

  if (isDemoMode()) {
    user = demo.getUser(userId);
    allUsers = demo.listUsers();
    allHistory = demo.listHistory();
  } else {
    const sb = supabaseAdmin();
    const [{ data: userRow }, { data: userRows }, { data: historyRows }] = await Promise.all([
      sb.from('users').select('*').eq('id', userId).maybeSingle(),
      sb.from('users').select('*'),
      sb.from('play_history').select('*, spotify_tracks(*)').order('played_at', { ascending: false }).limit(2000),
    ]);
    user = userRow ? rowToUser(userRow) : null;
    allUsers = (userRows ?? []).map(rowToUser);
    allHistory = (historyRows ?? []).map(rowToHistoryEntry);
  }

  if (!user) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

  const userHistory = allHistory.filter((h) => h.requestedBy === userId);
  const leaderboard = buildLeaderboard(allUsers, allHistory);
  const djRankEntry = leaderboard.find((c) => c.key === 'office_dj');
  const djRank = djRankEntry ? djRankEntry.entries.findIndex((e) => e.userId === userId) : -1;

  const soundProfile = buildSoundProfile(userId, userHistory, djRank >= 0 ? djRank + 1 : null);

  const requestCount = userHistory.length;
  const positiveCount = userHistory.filter((h) => h.ratingsSummary.love + h.ratingsSummary.good > h.ratingsSummary.meh + h.ratingsSummary.skip).length;

  return NextResponse.json({
    profile: user,
    soundProfile,
    stats: {
      requestCount,
      positivePercent: requestCount ? Math.round((positiveCount / requestCount) * 100) : 0,
      mostRequestedSong: topSong(userHistory),
      mostControversialSong: mostControversial(userHistory),
    },
  });
}

function topSong(history: PlayHistoryEntry[]) {
  const counts = new Map<string, { name: string; artist: string; count: number }>();
  for (const h of history) {
    const key = h.track.spotifyId;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { name: h.track.name, artist: h.track.artists[0] ?? '', count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)[0] ?? null;
}

function mostControversial(history: PlayHistoryEntry[]) {
  let best: { name: string; artist: string; splitScore: number } | null = null;
  for (const h of history) {
    const s = h.ratingsSummary;
    const total = s.love + s.good + s.meh + s.skip;
    if (total < 2) continue;
    const positive = s.love + s.good;
    const negative = s.skip;
    const splitScore = Math.min(positive, negative); // high when opinions are genuinely divided
    if (!best || splitScore > best.splitScore) {
      best = { name: h.track.name, artist: h.track.artists[0] ?? '', splitScore };
    }
  }
  return best;
}
