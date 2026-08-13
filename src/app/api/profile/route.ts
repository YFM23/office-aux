import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/mode';
import { getSessionUserId } from '@/lib/session';
import * as demo from '@/lib/demo/store';
import { supabaseAdmin } from '@/lib/supabase/server';
import { rowToUser } from '@/lib/supabase/mappers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ profile: null });

  if (isDemoMode()) {
    const profile = demo.getUser(userId);
    return NextResponse.json({ profile });
  }

  const { data } = await supabaseAdmin().from('users').select('*').eq('id', userId).maybeSingle();
  return NextResponse.json({ profile: data ? rowToUser(data) : null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nickname = String(body.nickname ?? '').trim().slice(0, 24);
  const avatarEmoji = String(body.avatarEmoji ?? '🎧').slice(0, 8);
  const favoriteGenres: string[] = Array.isArray(body.favoriteGenres) ? body.favoriteGenres.slice(0, 5) : [];
  const musicMood: string | null = body.musicMood ? String(body.musicMood).slice(0, 60) : null;

  if (!nickname) {
    return NextResponse.json({ error: 'Nickname is required.' }, { status: 400 });
  }

  if (isDemoMode()) {
    const profile = demo.createProfile(nickname, avatarEmoji, favoriteGenres, musicMood);
    const res = NextResponse.json({ profile });
    res.cookies.set('office_aux_uid', profile.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
    return res;
  }

  const { data, error } = await supabaseAdmin()
    .from('users')
    .insert({ nickname, avatar_emoji: avatarEmoji, favorite_genres: favoriteGenres, music_mood: musicMood })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'That nickname is already taken — try another.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Could not create your profile.' }, { status: 500 });
  }

  const res = NextResponse.json({ profile: rowToUser(data) });
  res.cookies.set('office_aux_uid', data.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
  return res;
}

export async function DELETE() {
  // Privacy: lets a team member delete their own profile & personal data.
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ ok: true });

  if (!isDemoMode()) {
    await supabaseAdmin().from('users').delete().eq('id', userId);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('office_aux_uid', '', { maxAge: 0, path: '/' });
  return res;
}
