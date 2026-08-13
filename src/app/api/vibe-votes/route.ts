import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { getSessionUserId } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import { tallyVibePercentages } from '@/lib/algorithms/stats';
import { DEFAULT_VIBES } from '@/lib/vibes';
import type { VibeKey, VibeVote } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const votes: VibeVote[] = isDemoMode()
    ? demo.listVibeVotes()
    : ((await supabaseAdmin().from('vibe_votes').select('user_id, vibe, created_at')).data ?? []).map((r: any) => ({
        userId: r.user_id,
        vibe: r.vibe,
        createdAt: r.created_at,
      }));

  return NextResponse.json({ vibes: DEFAULT_VIBES, tally: tallyVibePercentages(votes), totalVotes: votes.length });
}

export async function POST(req: NextRequest) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Create a profile first.' }, { status: 401 });

  const { vibe } = (await req.json()) as { vibe: VibeKey };
  if (!DEFAULT_VIBES.some((v) => v.key === vibe)) {
    return NextResponse.json({ error: 'Unknown vibe.' }, { status: 400 });
  }

  if (isDemoMode()) {
    demo.castVibeVote(userId, vibe);
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseAdmin().from('vibe_votes').upsert({ user_id: userId, vibe }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: 'Could not record vote.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
