import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { isAdminSession } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import * as spotify from '@/lib/spotify/client';

export async function POST() {
  if (!isAdminSession()) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  if (isDemoMode()) {
    demo.adminSetPlaying(false);
    return NextResponse.json({ ok: true });
  }
  try {
    await spotify.pause();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not pause playback.' }, { status: 500 });
  }
}
