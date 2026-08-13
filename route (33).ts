import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import { buildLeaderboard } from '@/lib/algorithms/leaderboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ categories: buildLeaderboard(demo.listUsers(), demo.listHistory()) });
  }

  const sb = supabaseAdmin();
  const [{ data: users }, { data: historyRows }] = await Promise.all([
    sb.from('users').select('*'),
    sb.from('play_history').select('*, spotify_tracks(*)').order('played_at', { ascending: false }).limit(2000),
  ]);

  const history = (historyRows ?? []).map((h: any) => ({
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

  const userProfiles = (users ?? []).map((u: any) => ({
    id: u.id,
    nickname: u.nickname,
    avatarEmoji: u.avatar_emoji,
    favoriteGenres: u.favorite_genres,
    musicMood: u.music_mood,
    isAdmin: u.is_admin,
    createdAt: u.created_at,
  }));

  return NextResponse.json({ categories: buildLeaderboard(userProfiles, history) });
}
