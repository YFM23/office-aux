import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { isSpotifyConnected } from '@/lib/spotify/tokenStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const demoMode = isDemoMode();
  const spotifyConnected = demoMode ? true : await isSpotifyConnected();
  return NextResponse.json({ demoMode, spotifyConnected });
}
