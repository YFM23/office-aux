import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import { computeCompatibility } from '@/lib/algorithms/compatibility';
import { rowToHistoryEntry } from '@/lib/supabase/mappers';
import type { PlayHistoryEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const a = req.nextUrl.searchParams.get('a');
  const b = req.nextUrl.searchParams.get('b');
  if (!a || !b) return NextResponse.json({ error: 'Two user ids are required.' }, { status: 400 });

  let allHistory: PlayHistoryEntry[];
  if (isDemoMode()) {
    allHistory = demo.listHistory();
  } else {
    const { data } = await supabaseAdmin()
      .from('play_history')
      .select('*, spotify_tracks(*)')
      .order('played_at', { ascending: false })
      .limit(2000);
    allHistory = (data ?? []).map(rowToHistoryEntry);
  }

  const aHistory = allHistory.filter((h) => h.requestedBy === a);
  const bHistory = allHistory.filter((h) => h.requestedBy === b);
  const result = computeCompatibility(aHistory, bHistory);
  return NextResponse.json(result);
}
