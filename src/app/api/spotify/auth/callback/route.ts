import { NextRequest, NextResponse } from 'next/server';
import { SPOTIFY_ACCOUNTS_BASE } from '@/lib/spotify/limitations';
import { saveTokens } from '@/lib/spotify/tokenStore';
import { isAdminSession, getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAdminSession()) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const expectedState = req.cookies.get('spotify_oauth_state')?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/admin?spotifyError=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL('/admin?spotifyError=state_mismatch', req.url));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenRes = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/admin?spotifyError=token_exchange_failed', req.url));
  }

  const json = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  await saveTokens({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresInSeconds: json.expires_in,
    scope: json.scope,
    connectedBy: getSessionUserId() ?? undefined,
  });

  const res = NextResponse.redirect(new URL('/admin?spotifyConnected=1', req.url));
  res.cookies.set('spotify_oauth_state', '', { maxAge: 0, path: '/' });
  return res;
}
