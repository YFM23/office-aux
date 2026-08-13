import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { getSessionUserId } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateRequest } from '@/lib/algorithms/requestValidation';
import { rankQueue } from '@/lib/algorithms/officeDjScore';
import type { AdminSettings, SongRequest, Track } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ queue: demo.listQueue() });
  }

  const sb = supabaseAdmin();
  const [requestsRes, adminRes, historyRes] = await Promise.all([
    sb
      .from('song_requests')
      .select('id, requested_by, created_at, spotify_tracks(*), users!song_requests_requested_by_fkey(nickname)')
      .eq('status', 'queued'),
    sb.from('admin_settings').select('*').eq('id', true).single(),
    sb.from('play_history').select('*').order('played_at', { ascending: false }).limit(6),
  ]);

  if (requestsRes.error) {
    console.error('GET /api/requests song_requests query failed:', requestsRes.error);
    return NextResponse.json({ queue: [] }, { status: 200 });
  }

  const rows = requestsRes.data;
  const history = historyRes.data;

  const votesRes = await sb.from('song_votes').select('request_id, value');
  const voteTotals = new Map<string, number>();
  for (const v of votesRes.data ?? []) {
    voteTotals.set(v.request_id, (voteTotals.get(v.request_id) ?? 0) + v.value);
  }

  const pending: SongRequest[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    track: rowToTrack(r.spotify_tracks),
    requestedBy: r.requested_by,
    requestedByNickname: r.users?.nickname ?? 'Someone',
    status: 'queued',
    createdAt: r.created_at,
    playedAt: null,
    votes: voteTotals.get(r.id) ?? 0,
  }));

  const recentPlays = (history ?? []).map((h: any) => ({
    requestedBy: h.requested_by,
    artist: h.spotify_id, // placeholder — join spotify_tracks in production for the real artist name
    genre: null,
  }));

  return NextResponse.json({ queue: rankQueue(pending, recentPlays) });
}

export async function POST(req: NextRequest) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Create a profile first.' }, { status: 401 });

  const body = await req.json();
  const track: Track | undefined = body.track;
  if (!track?.spotifyId) return NextResponse.json({ error: 'Missing track.' }, { status: 400 });

  if (isDemoMode()) {
    const outcome = demo.createRequest(userId, track.spotifyId);
    if (!outcome.ok) return NextResponse.json({ error: outcome.reason }, { status: 422 });
    return NextResponse.json({ request: outcome.request });
  }

  const sb = supabaseAdmin();
  await sb.from('spotify_tracks').upsert(trackToRow(track));

  const [{ data: adminRow }, { data: pendingRows }, { data: historyRows }, { data: nowPlaying }] = await Promise.all([
    sb.from('admin_settings').select('*').eq('id', true).single(),
    sb.from('song_requests').select('id, requested_by, created_at, spotify_tracks(*)').eq('status', 'queued'),
    sb.from('play_history').select('*, spotify_tracks(*)').order('played_at', { ascending: false }).limit(50),
    sb.from('now_playing_sessions').select('spotify_id').is('ended_at', null).maybeSingle(),
  ]);

  const admin = rowToAdminSettings(adminRow);
  const pendingQueue: SongRequest[] = (pendingRows ?? []).map((r: any) => ({
    id: r.id,
    track: rowToTrack(r.spotify_tracks),
    requestedBy: r.requested_by,
    requestedByNickname: '',
    status: 'queued',
    createdAt: r.created_at,
    playedAt: null,
    votes: 0,
  }));
  const recentHistory = (historyRows ?? []).map((h: any) => ({
    id: h.id,
    track: rowToTrack(h.spotify_tracks),
    requestedBy: h.requested_by,
    requestedByNickname: h.requested_by_nickname,
    playedAt: h.played_at,
    endedAt: h.ended_at,
    source: h.source,
    ratingsSummary: { love: h.love_count, good: h.good_count, meh: h.meh_count, skip: h.skip_count },
  }));

  const verdict = validateRequest({
    track,
    userId,
    admin,
    pendingQueue,
    nowPlayingTrackId: nowPlaying?.spotify_id ?? null,
    recentHistory,
  });
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 422 });

  const { data: inserted, error } = await sb
    .from('song_requests')
    .insert({ spotify_id: track.spotifyId, requested_by: userId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: 'Could not add that request.' }, { status: 500 });

  await sb.from('social_moments').insert({ text: `A new request just joined the queue: ${track.name}.` });

  return NextResponse.json({ request: inserted });
}

function rowToTrack(row: any): Track {
  return {
    spotifyId: row.spotify_id,
    uri: row.uri,
    name: row.name,
    artists: row.artists,
    albumName: row.album_name,
    albumArtUrl: row.album_art_url,
    durationMs: row.duration_ms,
    explicit: row.explicit,
    genreGuess: row.genre_guess,
    previewUrl: null,
  };
}

function trackToRow(t: Track) {
  return {
    spotify_id: t.spotifyId,
    uri: t.uri,
    name: t.name,
    artists: t.artists,
    album_name: t.albumName,
    album_art_url: t.albumArtUrl,
    duration_ms: t.durationMs,
    explicit: t.explicit,
    genre_guess: t.genreGuess,
  };
}

function rowToAdminSettings(row: any): AdminSettings {
  return {
    explicitAllowed: row.explicit_allowed,
    requestsEnabled: row.requests_enabled,
    maxActiveRequestsPerPerson: row.max_active_requests_per_person,
    songCooldownMinutes: row.song_cooldown_minutes,
    artistCooldownMinutes: row.artist_cooldown_minutes,
    maxConsecutiveTracksFromOneRequester: row.max_consecutive_tracks_from_one_requester,
    votingEnabled: row.voting_enabled,
    skipVoteThreshold: row.skip_vote_threshold,
    autoDjEnabled: row.auto_dj_enabled,
    vibeVotingEnabled: row.vibe_voting_enabled,
    partyModeEnabled: row.party_mode_enabled,
    blockedTrackIds: row.blocked_track_ids ?? [],
    blockedArtists: row.blocked_artists ?? [],
    blockedGenres: row.blocked_genres ?? [],
    officeHours: row.office_hours_open ? { open: row.office_hours_open, close: row.office_hours_close } : null,
    messageTone: row.message_tone,
    defaultSpotifyDeviceId: row.default_spotify_device_id,
  };
}
