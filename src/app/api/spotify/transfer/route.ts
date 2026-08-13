import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { isAdminSession } from '@/lib/session';
import * as spotify from '@/lib/spotify/client';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  if (!isAdminSession()) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const { deviceId } = await req.json();
  if (!deviceId) return NextResponse.json({ error: 'deviceId required.' }, { status: 400 });

  if (isDemoMode()) return NextResponse.json({ ok: true });

  try {
    await spotify.transferPlayback(deviceId, true);
    await supabaseAdmin().from('admin_settings').update({ default_spotify_device_id: deviceId }).eq('id', true);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not switch devices.' }, { status: 500 });
  }
}
