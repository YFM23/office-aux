import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client using the SERVICE ROLE key. Never import this
// file from a "use client" component — it must only ever run in Route
// Handlers / Server Components. The service role key bypasses RLS entirely,
// which is why all business-rule validation (cooldowns, blocklists, request
// limits) happens in our own route handlers rather than in RLS policies.
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars are not configured — this should only be called in LIVE mode.');
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
