import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import { buildOfficeStats } from '@/lib/algorithms/stats';
import { rowToHistoryEntry } from '@/lib/supabase/mappers';
import type { OfficeStatsSnapshot, VibeVote } from '@/lib/types';

export const dynamic = 'force-dynamic';

const RANGE_MS: Record<string, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  all: Infinity,
};

export async function GET(req: NextRequest) {
  const range = (req.nextUrl.searchParams.get('range') ?? 'today') as OfficeStatsSnapshot['range'];
  const windowMs = RANGE_MS[range] ?? RANGE_MS.today!;
  const cutoff = Date.now() - windowMs;

  if (isDemoMode()) {
    const history = demo.listHistory().filter((h) => windowMs === Infinity || new Date(h.playedAt).getTime() >= cutoff);
    const todayRequests = demo.listQueue(); // pending requests count as "requested today" alongside history in this simple model
    const stats = buildOfficeStats(range, history, todayRequests, demo.listVibeVotes());
    return NextResponse.json({ stats });
  }

  const sb = supabaseAdmin();
  const [{ data: historyRows }, { data: vibeRows }, { data: pendingRows }] = await Promise.all([
    sb.from('play_history').select('*, spotify_tracks(*)').order('played_at', { ascending: false }).limit(2000),
    sb.from('vibe_votes').select('user_id, vibe, created_at'),
    sb.from('song_requests').select('id').eq('status', 'queued'),
  ]);

  const history = (historyRows ?? [])
    .map(rowToHistoryEntry)
    .filter((h) => windowMs === Infinity || new Date(h.playedAt).getTime() >= cutoff);
  const vibeVotes: VibeVote[] = (vibeRows ?? []).map((r: any) => ({ userId: r.user_id, vibe: r.vibe, createdAt: r.created_at }));

  const stats = buildOfficeStats(range, history, (pendingRows ?? []) as any, vibeVotes);
  return NextResponse.json({ stats });
}
