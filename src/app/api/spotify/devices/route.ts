import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { isAdminSession } from '@/lib/session';
import * as spotify from '@/lib/spotify/client';
import { isSpotifyConnected } from '@/lib/spotify/tokenStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAdminSession()) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  if (isDemoMode()) {
    return NextResponse.json({ devices: [{ id: 'demo-device', name: 'Office Speakers (Demo)', isActive: true, volumePercent: 65 }] });
  }
  if (!(await isSpotifyConnected())) return NextResponse.json({ devices: [], error: 'Spotify not connected.' });

  try {
    const devices = await spotify.getDevices();
    return NextResponse.json({ devices });
  } catch {
    return NextResponse.json({ devices: [], error: 'Could not load devices.' });
  }
}
