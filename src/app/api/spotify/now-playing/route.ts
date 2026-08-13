import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import * as demo from '@/lib/demo/store';
import * as spotify from '@/lib/spotify/client';
import { SpotifyApiError } from '@/lib/spotify/client';
import { isSpotifyConnected } from '@/lib/spotify/tokenStore';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ demoMode: true, ...demo.getNowPlaying() });
  }

  const connected = await isSpotifyConnected();
  if (!connected) {
    return NextResponse.json({ demoMode: false, state: 'disconnected' }, { status: 200 });
  }

  try {
    const [np, playback, session] = await Promise.all([
      spotify.getNowPlaying(),
      spotify.getPlaybackState().catch(() => null),
      supabaseAdmin().from('now_playing_sessions').select('id').is('ended_at', null).maybeSingle(),
    ]);
    if (!np) {
      return NextResponse.json({ demoMode: false, state: 'idle', isPlaying: false, track: null });
    }
    return NextResponse.json({
      demoMode: false,
      state: 'ok',
      isPlaying: np.isPlaying,
      track: np.track,
      progressMs: np.progressMs,
      sessionId: session.data?.id ?? null,
      device: playback?.device ? { id: playback.device.id, name: playback.device.name, volumePercent: playback.device.volume_percent } : null,
    });
  } catch (e) {
    if (e instanceof SpotifyApiError) {
      if (e.code === 'NO_DEVICE') return NextResponse.json({ demoMode: false, state: 'no_device' });
      if (e.code === 'RATE_LIMITED') return NextResponse.json({ demoMode: false, state: 'rate_limited' });
      if (e.code === 'UNAUTHORIZED') return NextResponse.json({ demoMode: false, state: 'token_expired' });
    }
    return NextResponse.json({ demoMode: false, state: 'error' });
  }
}
