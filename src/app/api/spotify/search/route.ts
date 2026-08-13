import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import * as demo from '@/lib/demo/store';
import * as spotify from '@/lib/spotify/client';
import { isSpotifyConnected } from '@/lib/spotify/tokenStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json({ tracks: [] });

  if (isDemoMode()) {
    return NextResponse.json({ tracks: demo.searchTracks(q) });
  }

  if (!(await isSpotifyConnected())) {
    return NextResponse.json({ tracks: [], error: 'Spotify is not connected yet.' }, { status: 200 });
  }

  try {
    const tracks = await spotify.searchTracks(q);
    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ tracks: [], error: 'Search failed — try again in a moment.' }, { status: 200 });
  }
}
