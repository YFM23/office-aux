import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { isAdminSession } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import * as spotify from '@/lib/spotify/client';

// Admin instant-skip. Team member skips go through /api/skip-votes instead
// and only take effect once the threshold is met (see queue/tick).
export async function POST() {
  if (!isAdminSession()) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  if (isDemoMode()) {
    demo.adminSkip();
    return NextResponse.json({ ok: true });
  }
  try {
    await spotify.skipToNext();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not skip.' }, { status: 500 });
  }
}
