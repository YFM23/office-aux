import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { SPOTIFY_ACCOUNTS_BASE, SPOTIFY_SCOPES } from '@/lib/spotify/limitations';
import { isAdminSession } from '@/lib/session';

// Starts the Spotify OAuth Authorization Code flow for the HOST account
// only. Admin-gated: a team member's browser can never trigger this.
export async function GET() {
  if (!isAdminSession()) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Spotify env vars are not configured. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI.' },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES.join(' '),
    state,
    show_dialog: 'true',
  });

  const res = NextResponse.redirect(`${SPOTIFY_ACCOUNTS_BASE}/authorize?${params.toString()}`);
  res.cookies.set('spotify_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return res;
}
