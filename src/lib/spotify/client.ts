import type { Track } from '../types';
import { getValidAccessToken } from './tokenStore';
import { SPOTIFY_API_BASE, SPOTIFY_SEARCH_MAX_LIMIT } from './limitations';

// LIVE MODE ONLY — thin, typed wrapper around the subset of the Spotify Web
// API that's actually available to a development-mode app today (see
// limitations.ts for the full rationale). Every function here runs
// server-side and throws typed errors that API routes translate into the
// friendly states required by the spec (Spotify disconnected, no device,
// rate limited, expired token, track unavailable) instead of leaking raw
// Spotify error bodies to the browser.

export class SpotifyApiError extends Error {
  constructor(
    public status: number,
    public spotifyMessage: string,
    public code:
      | 'NO_DEVICE'
      | 'RATE_LIMITED'
      | 'UNAUTHORIZED'
      | 'NOT_FOUND'
      | 'UNKNOWN' = 'UNKNOWN'
  ) {
    super(spotifyMessage);
  }
}

async function spotifyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken();
  const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (res.status === 429) {
    throw new SpotifyApiError(429, 'Spotify is rate-limiting us right now.', 'RATE_LIMITED');
  }
  if (res.status === 401) {
    throw new SpotifyApiError(401, 'Spotify access token was rejected.', 'UNAUTHORIZED');
  }
  if (res.status === 404) {
    throw new SpotifyApiError(404, 'Not found.', 'NOT_FOUND');
  }
  if (res.status === 403) {
    // Most commonly: no active device for a playback command.
    const body = await res.json().catch(() => null);
    const reason = body?.error?.reason;
    if (reason === 'NO_ACTIVE_DEVICE') {
      throw new SpotifyApiError(403, 'No active Spotify device.', 'NO_DEVICE');
    }
    throw new SpotifyApiError(403, body?.error?.message ?? 'Forbidden', 'UNKNOWN');
  }
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new SpotifyApiError(res.status, body, 'UNKNOWN');
  }
  return res;
}

function mapTrack(t: any): Track {
  return {
    spotifyId: t.id,
    uri: t.uri,
    name: t.name,
    artists: (t.artists ?? []).map((a: any) => a.name),
    albumName: t.album?.name ?? '',
    albumArtUrl: t.album?.images?.[0]?.url ?? null,
    durationMs: t.duration_ms,
    explicit: Boolean(t.explicit),
    genreGuess: null, // populated separately via a best-effort artist genre lookup — see resolveGenreGuess()
    previewUrl: t.preview_url ?? null,
  };
}

export async function searchTracks(query: string): Promise<Track[]> {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: String(SPOTIFY_SEARCH_MAX_LIMIT), // Spotify's hard ceiling as of 2026 — see limitations.ts
  });
  const res = await spotifyFetch(`/search?${params.toString()}`);
  const json = await res.json();
  return (json.tracks?.items ?? []).map(mapTrack);
}

/** Best-effort genre tag: the single-item Get Artist endpoint still returns
 * `genres`, unlike the batch "get several artists" endpoint that Spotify
 * removed in Feb 2026. Cache the result — don't call this per-request. */
export async function resolveArtistGenre(artistId: string): Promise<string | null> {
  try {
    const res = await spotifyFetch(`/artists/${artistId}`);
    const json = await res.json();
    return json.genres?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function getNowPlaying() {
  const res = await spotifyFetch('/me/player/currently-playing');
  if (res.status === 204) return null; // nothing playing
  const json = await res.json();
  if (!json || !json.item) return null;
  return {
    isPlaying: Boolean(json.is_playing),
    progressMs: json.progress_ms ?? 0,
    track: mapTrack(json.item),
  };
}

export async function getPlaybackState() {
  const res = await spotifyFetch('/me/player');
  if (res.status === 204) return null;
  return res.json();
}

export async function getDevices(): Promise<{ id: string; name: string; isActive: boolean; volumePercent: number | null }[]> {
  const res = await spotifyFetch('/me/player/devices');
  const json = await res.json();
  return (json.devices ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    isActive: Boolean(d.is_active),
    volumePercent: d.volume_percent ?? null,
  }));
}

export async function transferPlayback(deviceId: string, play = false) {
  await spotifyFetch('/me/player', {
    method: 'PUT',
    body: JSON.stringify({ device_ids: [deviceId], play }),
  });
}

export async function play(deviceId?: string, uris?: string[]) {
  const q = deviceId ? `?device_id=${deviceId}` : '';
  await spotifyFetch(`/me/player/play${q}`, {
    method: 'PUT',
    body: uris ? JSON.stringify({ uris }) : undefined,
  });
}

export async function pause() {
  await spotifyFetch('/me/player/pause', { method: 'PUT' });
}

export async function skipToNext() {
  await spotifyFetch('/me/player/next', { method: 'POST' });
}

export async function addToQueue(uri: string, deviceId?: string) {
  const params = new URLSearchParams({ uri });
  if (deviceId) params.set('device_id', deviceId);
  await spotifyFetch(`/me/player/queue?${params.toString()}`, { method: 'POST' });
}
