import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import * as demo from '@/lib/demo/store';
import * as spotify from '@/lib/spotify/client';
import { isSpotifyConnected } from '@/lib/spotify/tokenStore';
import { supabaseAdmin } from '@/lib/supabase/server';
import { rankQueue } from '@/lib/algorithms/officeDjScore';
import { pickAutoDjQuery } from '@/lib/algorithms/autoDj';
import { tallyVibePercentages } from '@/lib/algorithms/stats';
import { rowToHistoryEntry, rowToTrack } from '@/lib/supabase/mappers';
import type { SongRequest } from '@/lib/types';

/**
 * QUEUE TICK — the heartbeat that turns "our ranked queue" into "what's
 * actually playing on Spotify."
 *
 * Why this exists at all: Spotify's API has no way to reorder or clear its
 * own native playback queue (only GET to read it and POST to append one
 * item — see limitations.ts), so we can't just keep Spotify's queue in sync
 * with live votes. Instead Office Aux keeps its OWN ranked queue in
 * Postgres and, whenever the currently-playing track is finishing (or a
 * skip vote crosses the threshold), tells Spotify to start playing the
 * current #1 pick directly via `PUT /me/player/play` with an explicit uri.
 * That's the only way to guarantee "the song that's winning the vote right
 * now" is what plays next, rather than whatever Spotify's queue happened to
 * have lined up.
 *
 * In Demo Mode this is a no-op — the in-memory store advances itself
 * lazily on every read (see demo/store.ts `tick()`), which is enough for a
 * single-process demo. In LIVE mode, call this endpoint on an interval —
 * either a Vercel Cron Job (recommended, every 10–15s) or a `setInterval`
 * poll from the Party Mode / TV display page, which is likely open in the
 * office all day anyway. See README → Deployment for the exact Cron config.
 */
export async function POST() {
  if (isDemoMode()) {
    // Reading any state already advances the simulated clock.
    demo.getNowPlaying();
    return NextResponse.json({ ok: true, demoMode: true });
  }

  if (!(await isSpotifyConnected())) {
    return NextResponse.json({ ok: false, reason: 'spotify_not_connected' });
  }

  const sb = supabaseAdmin();
  const { data: adminRow } = await sb.from('admin_settings').select('*').eq('id', true).single();
  if (!adminRow) return NextResponse.json({ ok: false, reason: 'no_admin_settings' });

  const { data: openSession } = await sb
    .from('now_playing_sessions')
    .select('*')
    .is('ended_at', null)
    .maybeSingle();

  let playbackState;
  try {
    playbackState = await spotify.getNowPlaying();
  } catch {
    return NextResponse.json({ ok: false, reason: 'spotify_error' });
  }

  const skipCount = openSession
    ? (await sb.from('skip_votes').select('*', { count: 'exact', head: true }).eq('session_id', openSession.id)).count ?? 0
    : 0;
  const skipThresholdReached = skipCount >= (adminRow.skip_vote_threshold ?? 3);

  const trackFinishedNaturally =
    openSession && (!playbackState || playbackState.track.spotifyId !== openSession.spotify_id);

  const needsNext = !openSession || skipThresholdReached || trackFinishedNaturally;
  if (!needsNext) {
    return NextResponse.json({ ok: true, action: 'none' });
  }

  // Close out the open session (if any) into permanent history.
  if (openSession) {
    const { data: ratings } = await sb.from('song_ratings').select('value').eq('session_id', openSession.id);
    const summary = { love: 0, good: 0, meh: 0, skip: 0 } as Record<string, number>;
    for (const r of ratings ?? []) summary[r.value] = (summary[r.value] ?? 0) + 1;

    await sb.from('now_playing_sessions').update({ ended_at: new Date().toISOString() }).eq('id', openSession.id);
    await sb.from('play_history').insert({
      spotify_id: openSession.spotify_id,
      requested_by: openSession.requested_by,
      requested_by_nickname: openSession.requested_by
        ? (await sb.from('users').select('nickname').eq('id', openSession.requested_by).maybeSingle()).data?.nickname
        : null,
      played_at: openSession.started_at,
      ended_at: new Date().toISOString(),
      source: openSession.source,
      love_count: summary.love ?? 0,
      good_count: summary.good ?? 0,
      meh_count: summary.meh ?? 0,
      skip_count: summary.skip ?? 0,
    });
    if (skipThresholdReached) {
      try {
        await spotify.skipToNext();
      } catch {
        /* fall through to explicit play() below regardless */
      }
    }
  }

  // Pick what plays next: top of our ranked queue, or Auto DJ.
  const { data: pendingRows } = await sb
    .from('song_requests')
    .select('id, requested_by, created_at, spotify_tracks(*), users!song_requests_requested_by_fkey(nickname)')
    .eq('status', 'queued');
  const { data: recentHistoryRows } = await sb
    .from('play_history')
    .select('*, spotify_tracks(*)')
    .order('played_at', { ascending: false })
    .limit(6);

  const pending: SongRequest[] = (pendingRows ?? []).map((r: any) => ({
    id: r.id,
    track: rowToTrack(r.spotify_tracks),
    requestedBy: r.requested_by,
    requestedByNickname: r.users?.nickname ?? 'Someone',
    status: 'queued',
    createdAt: r.created_at,
    playedAt: null,
    votes: 0, // vote totals are re-fetched in GET /api/requests for display; ranking here uses wait/repetition as the tiebreak
  }));
  const recentPlays = (recentHistoryRows ?? []).map(rowToHistoryEntry).map((h) => ({
    requestedBy: h.requestedBy,
    artist: h.track.artists[0] ?? '',
    genre: h.track.genreGuess,
  }));

  if (pending.length > 0) {
    const ranked = rankQueue(pending, recentPlays);
    const next = ranked[0]!;
    try {
      await spotify.play(adminRow.default_spotify_device_id ?? undefined, [next.track.uri]);
    } catch {
      return NextResponse.json({ ok: false, reason: 'playback_failed' });
    }
    await sb.from('song_requests').delete().eq('id', next.id);
    await sb.from('now_playing_sessions').insert({
      spotify_id: next.track.spotifyId,
      requested_by: next.requestedBy,
      source: 'request',
    });
    await sb.from('social_moments').insert({ text: `${next.requestedByNickname}'s request is now playing.` });
    return NextResponse.json({ ok: true, action: 'played_request', track: next.track.name });
  }

  if (!adminRow.auto_dj_enabled) {
    return NextResponse.json({ ok: true, action: 'idle_no_autodj' });
  }

  const { data: vibeRows } = await sb.from('vibe_votes').select('user_id, vibe, created_at');
  const tally = tallyVibePercentages((vibeRows ?? []).map((r: any) => ({ userId: r.user_id, vibe: r.vibe, createdAt: r.created_at })));
  const { query } = pickAutoDjQuery(tally[0]?.vibe ?? null);

  try {
    const results = await spotify.searchTracks(query);
    const notRecentlyPlayed = results.filter((t) => !recentPlays.some((p) => p.artist === t.artists[0]));
    const pick = (notRecentlyPlayed[0] ?? results[0]) ?? null;
    if (!pick) return NextResponse.json({ ok: true, action: 'autodj_no_results' });

    await spotify.play(adminRow.default_spotify_device_id ?? undefined, [pick.uri]);
    await sb.from('spotify_tracks').upsert({
      spotify_id: pick.spotifyId,
      uri: pick.uri,
      name: pick.name,
      artists: pick.artists,
      album_name: pick.albumName,
      album_art_url: pick.albumArtUrl,
      duration_ms: pick.durationMs,
      explicit: pick.explicit,
      genre_guess: pick.genreGuess,
    });
    await sb.from('now_playing_sessions').insert({ spotify_id: pick.spotifyId, requested_by: null, source: 'autopilot' });
    return NextResponse.json({ ok: true, action: 'played_autodj', track: pick.name });
  } catch {
    return NextResponse.json({ ok: false, reason: 'autodj_search_failed' });
  }
}
