import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { isAdminSession } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { AdminSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  if (isDemoMode()) return NextResponse.json({ settings: demo.getAdminSettings() });

  const { data, error } = await supabaseAdmin().from('admin_settings').select('*').eq('id', true).single();
  if (error || !data) return NextResponse.json({ settings: null, error: 'Could not load settings.' }, { status: 200 });
  return NextResponse.json({ settings: rowToAdminSettings(data) });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminSession()) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  const patch: Partial<AdminSettings> = await req.json();

  if (isDemoMode()) {
    const settings = demo.updateAdminSettings(patch);
    return NextResponse.json({ settings });
  }

  const row: Record<string, unknown> = {};
  if (patch.explicitAllowed !== undefined) row.explicit_allowed = patch.explicitAllowed;
  if (patch.requestsEnabled !== undefined) row.requests_enabled = patch.requestsEnabled;
  if (patch.maxActiveRequestsPerPerson !== undefined) row.max_active_requests_per_person = patch.maxActiveRequestsPerPerson;
  if (patch.songCooldownMinutes !== undefined) row.song_cooldown_minutes = patch.songCooldownMinutes;
  if (patch.artistCooldownMinutes !== undefined) row.artist_cooldown_minutes = patch.artistCooldownMinutes;
  if (patch.maxConsecutiveTracksFromOneRequester !== undefined)
    row.max_consecutive_tracks_from_one_requester = patch.maxConsecutiveTracksFromOneRequester;
  if (patch.votingEnabled !== undefined) row.voting_enabled = patch.votingEnabled;
  if (patch.skipVoteThreshold !== undefined) row.skip_vote_threshold = patch.skipVoteThreshold;
  if (patch.autoDjEnabled !== undefined) row.auto_dj_enabled = patch.autoDjEnabled;
  if (patch.vibeVotingEnabled !== undefined) row.vibe_voting_enabled = patch.vibeVotingEnabled;
  if (patch.partyModeEnabled !== undefined) row.party_mode_enabled = patch.partyModeEnabled;
  if (patch.blockedTrackIds !== undefined) row.blocked_track_ids = patch.blockedTrackIds;
  if (patch.blockedArtists !== undefined) row.blocked_artists = patch.blockedArtists;
  if (patch.blockedGenres !== undefined) row.blocked_genres = patch.blockedGenres;
  if (patch.messageTone !== undefined) row.message_tone = patch.messageTone;
  if (patch.defaultSpotifyDeviceId !== undefined) row.default_spotify_device_id = patch.defaultSpotifyDeviceId;

  const { data, error } = await supabaseAdmin().from('admin_settings').update(row).eq('id', true).select().single();
  if (error) return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  return NextResponse.json({ settings: rowToAdminSettings(data) });
}
