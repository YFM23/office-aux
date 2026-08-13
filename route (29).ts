import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { getSessionUserId } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { RatingValue } from '@/lib/types';

const VALID: RatingValue[] = ['love', 'good', 'meh', 'skip'];

export async function POST(req: NextRequest) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Create a profile first.' }, { status: 401 });

  const { value } = await req.json();
  if (!VALID.includes(value)) return NextResponse.json({ error: 'Invalid rating.' }, { status: 400 });

  if (isDemoMode()) {
    const result = demo.rateNowPlaying(userId, value);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  const sb = supabaseAdmin();
  const { data: session } = await sb
    .from('now_playing_sessions')
    .select('id')
    .is('ended_at', null)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'Nothing is playing right now.' }, { status: 422 });

  const { error } = await sb.from('song_ratings').insert({ session_id: session.id, user_id: userId, value });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'You already rated this song.' }, { status: 409 });
    return NextResponse.json({ error: 'Could not record rating.' }, { status: 500 });
  }

  if (value === 'skip') {
    await sb.from('skip_votes').upsert({ session_id: session.id, user_id: userId }, { onConflict: 'session_id,user_id' });
  }

  return NextResponse.json({ ok: true });
}
