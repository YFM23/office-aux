import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { getSessionUserId } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ state: demo.getSkipVoteState() });
  }
  const sb = supabaseAdmin();
  const [{ data: session }, { data: adminRow }] = await Promise.all([
    sb.from('now_playing_sessions').select('id').is('ended_at', null).maybeSingle(),
    sb.from('admin_settings').select('skip_vote_threshold').eq('id', true).single(),
  ]);
  if (!session) return NextResponse.json({ state: null });
  const { count } = await sb.from('skip_votes').select('*', { count: 'exact', head: true }).eq('session_id', session.id);
  return NextResponse.json({ state: { sessionId: session.id, votes: count ?? 0, threshold: adminRow?.skip_vote_threshold ?? 3 } });
}

export async function POST() {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Create a profile first.' }, { status: 401 });

  if (isDemoMode()) {
    const result = demo.castExplicitSkipVote(userId);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  const sb = supabaseAdmin();
  const { data: session } = await sb.from('now_playing_sessions').select('id').is('ended_at', null).maybeSingle();
  if (!session) return NextResponse.json({ error: 'Nothing is playing right now.' }, { status: 422 });

  const { error } = await sb.from('skip_votes').upsert({ session_id: session.id, user_id: userId }, { onConflict: 'session_id,user_id' });
  if (error) return NextResponse.json({ error: 'Could not record your vote.' }, { status: 500 });

  // The actual skip-when-threshold-reached transition happens in
  // /api/queue/tick (see that route for why polling/cron drives playback
  // transitions rather than doing it inline here).
  return NextResponse.json({ ok: true });
}
