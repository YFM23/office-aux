import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { PlayHistoryEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

const RANGE_MS: Record<string, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  all: Infinity,
};

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') ?? 'today';
  const windowMs = RANGE_MS[range] ?? RANGE_MS.today!;
  const cutoff = Date.now() - windowMs;

  let history: PlayHistoryEntry[];
  if (isDemoMode()) {
    history = demo.listHistory();
  } else {
    const { data } = await supabaseAdmin()
      .from('play_history')
      .select('*, spotify_tracks(*)')
      .order('played_at', { ascending: false })
      .limit(500);
    history = (data ?? []).map((h: any) => ({
      id: h.id,
      track: {
        spotifyId: h.spotify_tracks.spotify_id,
        uri: h.spotify_tracks.uri,
        name: h.spotify_tracks.name,
        artists: h.spotify_tracks.artists,
        albumName: h.spotify_tracks.album_name,
        albumArtUrl: h.spotify_tracks.album_art_url,
        durationMs: h.spotify_tracks.duration_ms,
        explicit: h.spotify_tracks.explicit,
        genreGuess: h.spotify_tracks.genre_guess,
        previewUrl: null,
      },
      requestedBy: h.requested_by,
      requestedByNickname: h.requested_by_nickname,
      playedAt: h.played_at,
      endedAt: h.ended_at,
      source: h.source,
      ratingsSummary: { love: h.love_count, good: h.good_count, meh: h.meh_count, skip: h.skip_count },
    }));
  }

  const filtered = windowMs === Infinity ? history : history.filter((h) => new Date(h.playedAt).getTime() >= cutoff);
  return NextResponse.json({ history: filtered });
}
