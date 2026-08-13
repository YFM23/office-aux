import { supabaseAdmin } from '../supabase/server';
import { SPOTIFY_ACCOUNTS_BASE } from './limitations';

// LIVE MODE ONLY. Tokens are stored server-side in Supabase's spotify_tokens
// table (service-role access only, no RLS policy grants it to anyone else —
// see supabase/migrations/0001_init.sql) and are never sent to the browser.

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO
}

export async function saveTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  scope: string;
  connectedBy?: string;
}) {
  const expiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000).toISOString();
  const { error } = await supabaseAdmin().from('spotify_tokens').upsert({
    id: true,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: expiresAt,
    scope: tokens.scope,
    connected_by: tokens.connectedBy ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function readTokens(): Promise<StoredTokens | null> {
  const { data, error } = await supabaseAdmin()
    .from('spotify_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('id', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: data.expires_at };
}

/** Returns a valid access token, transparently refreshing it if it's expired
 * or about to expire. Throws a typed error the API routes translate into a
 * friendly "Spotify disconnected" state rather than a raw 401. */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await readTokens();
  if (!tokens) {
    const err = new Error('SPOTIFY_NOT_CONNECTED');
    err.name = 'SpotifyNotConnected';
    throw err;
  }

  const expiresInMs = new Date(tokens.expiresAt).getTime() - Date.now();
  if (expiresInMs > 60_000) {
    return tokens.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!res.ok) {
    const err = new Error('SPOTIFY_REFRESH_FAILED');
    err.name = 'SpotifyRefreshFailed';
    throw err;
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
  };

  await saveTokens({
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? tokens.refreshToken, // Spotify doesn't always rotate it
    expiresInSeconds: json.expires_in,
    scope: json.scope,
  });

  return json.access_token;
}

export async function isSpotifyConnected(): Promise<boolean> {
  try {
    const tokens = await readTokens();
    return tokens !== null;
  } catch {
    return false;
  }
}

export async function disconnectSpotify() {
  const { error } = await supabaseAdmin().from('spotify_tokens').delete().eq('id', true);
  if (error) throw error;
}
