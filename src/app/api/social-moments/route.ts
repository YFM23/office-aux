import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (isDemoMode()) return NextResponse.json({ moments: demo.listSocialMoments() });

  const { data } = await supabaseAdmin()
    .from('social_moments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  return NextResponse.json({ moments: (data ?? []).map((m: any) => ({ id: m.id, text: m.text, createdAt: m.created_at })) });
}
