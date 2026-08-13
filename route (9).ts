import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { isAdminSession } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';

// Resets office-wide statistics (history, ratings, votes, vibe votes, social
// moments). Deliberately keeps team profiles and admin settings intact —
// this is a "start the scoreboard over," not a "delete everyone" button.
export async function POST() {
  if (!isAdminSession()) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  if (isDemoMode()) {
    demo.resetOfficeStats();
    return NextResponse.json({ ok: true });
  }

  const sb = supabaseAdmin();
  await Promise.all([
    sb.from('play_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    sb.from('song_ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    sb.from('song_votes').delete().neq('user_id', '00000000-0000-0000-0000-000000000000'),
    sb.from('vibe_votes').delete().neq('user_id', '00000000-0000-0000-0000-000000000000'),
    sb.from('skip_votes').delete().neq('user_id', '00000000-0000-0000-0000-000000000000'),
    sb.from('social_moments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
  ]);
  return NextResponse.json({ ok: true });
}
