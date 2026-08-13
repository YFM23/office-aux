import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { getSessionUserId } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Create a profile first.' }, { status: 401 });

  const { requestId, value } = await req.json();
  if (!requestId || (value !== 1 && value !== -1)) {
    return NextResponse.json({ error: 'Invalid vote.' }, { status: 400 });
  }

  if (isDemoMode()) {
    const result = demo.voteRequest(requestId, userId, value);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseAdmin()
    .from('song_votes')
    .upsert({ request_id: requestId, user_id: userId, value }, { onConflict: 'request_id,user_id' });
  if (error) return NextResponse.json({ error: 'Could not record vote.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
