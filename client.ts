'use client';

import { createClient } from '@supabase/supabase-js';

// Browser-safe Supabase client using the public ANON key only. Used for
// read-only realtime subscriptions (queue changes, votes, now playing).
// All writes go through our own /api/* route handlers instead of direct
// Supabase calls, so validation stays server-side.
let cached: ReturnType<typeof createClient> | null = null;

export function supabaseBrowser() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null; // Demo Mode: no realtime, screens poll instead.
  cached = createClient(url, key);
  return cached;
}
