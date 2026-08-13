// Office Aux runs in one of two modes:
//   DEMO MODE  — no Spotify/Supabase credentials required. Everything is
//                simulated in-memory so you can evaluate the whole product
//                before wiring up real accounts.
//   LIVE MODE  — Supabase holds all app data and the host's Spotify account
//                controls real playback.
//
// Mode is auto-detected from environment variables so there is nothing to
// remember to toggle: set up Supabase + Spotify env vars and the app comes
// alive for real. Leave them unset (e.g. on first clone) and you get the
// fully-seeded Demo Mode instead.

export function isDemoMode(): boolean {
  if (process.env.OFFICE_AUX_FORCE_DEMO === 'true') return true;
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const hasSpotify = Boolean(
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
  );
  return !(hasSupabase && hasSpotify);
}
