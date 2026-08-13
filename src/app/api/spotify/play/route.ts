import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { isAdminSession } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import * as spotify from '@/lib/spotify/client';
import { SpotifyApiError } from '@/lib/spotify/client';

export async function POST() {
  if (!isAdminSession()) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  if (isDemoMode()) {
    demo.adminSetPlaying(true);
    return NextResponse.json({ ok: true });
  }
  try {
    await spotify.play();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SpotifyApiError && e.code === 'NO_DEVICE') {
      return NextResponse.json({ error: 'No active Spotify device — pick one in Admin → Devices.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Could not start playback.' }, { status: 500 });
  }
}
