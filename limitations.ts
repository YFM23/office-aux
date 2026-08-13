/**
 * SPOTIFY WEB API — CURRENT LIMITATIONS (checked against Spotify's own
 * developer changelog/blog as of Aug 2026)
 * ---------------------------------------------------------------------
 * These constraints directly shaped Office Aux's architecture. Read this
 * before "fixing" something that looks like a bug — it's often a Spotify
 * platform limit, not a bug in this app.
 *
 * 1. NO ALGORITHMIC RECOMMENDATIONS FOR NEW APPS.
 *    Since 27 Nov 2024, Spotify blocks new apps from:
 *      - GET /recommendations
 *      - GET /audio-features, GET /audio-analysis
 *      - GET /artists/{id}/related-artists
 *      - GET /browse/featured-playlists, GET /browse/categories/{id}/playlists
 *    Apps registered after that date (this one included) get 403s on all of
 *    these, permanently — Spotify has said this will not be reversed for new
 *    apps. This means:
 *      - Auto DJ CANNOT call Spotify for "similar songs." Instead it searches
 *        Spotify's catalog using vibe-tagged keyword pools (see
 *        lib/algorithms/autoDj.ts) combined with our own office history —
 *        i.e. we recommend from what THIS office has liked, not from
 *        Spotify's taste graph.
 *      - Sound Profiles CANNOT use energy/valence/danceability audio
 *        features. They're built entirely from behavioural data: request
 *        frequency, genre tags supplied at request time, vibe votes, and
 *        rating history. This is arguably more honest anyway — it reflects
 *        what the office actually does, not a black-box audio fingerprint.
 *
 * 2. FEBRUARY 2026 CATALOG CUTS.
 *    Spotify additionally removed for new/dev-mode apps:
 *      - GET /artists/{id}/top-tracks, GET /browse/new-releases,
 *        GET /browse/categories, batch "get several X" endpoints
 *      - `popularity` and `followers` fields on track/artist objects
 *    Effect: there's no Spotify-provided "hidden gem" score anymore. The
 *    "Hidden Gem Hunter" leaderboard category is computed purely from
 *    office data instead (highly rated tracks that only 1–2 people
 *    requested) — see lib/algorithms/leaderboard-notes in the stats module.
 *
 * 3. SEARCH RESULTS ARE CAPPED AT 10.
 *    `GET /v1/search` now has a hard `limit` ceiling of 10 (previously 50).
 *    The request-search UI paginates in pages of 10 rather than the
 *    "load 20, then 50" pattern you'd see in older Spotify API tutorials.
 *
 * 4. DEVELOPMENT MODE IS PERMANENT FOR THIS USE CASE — AND THAT'S FINE.
 *    Only the HOST authenticates with Spotify (a single OAuth user). Team
 *    members never touch Spotify OAuth at all. Development-mode apps allow
 *    up to 5 allowlisted authenticated users, so a single-host jukebox sits
 *    comfortably inside that cap forever. "Extended quota" mode now requires
 *    an organisation with 250k+ MAU, which is irrelevant here — do not try
 *    to apply for it.
 *    The one operational catch: the Spotify account used to REGISTER the
 *    app, and the account that authorizes it, must have Spotify Premium, or
 *    playback control silently stops working.
 *
 * 5. PLAYBACK CONTROL SURFACE THAT DOES STILL WORK (this is what the whole
 *    app is built on):
 *      GET  /v1/me/player                         (playback state)
 *      GET  /v1/me/player/currently-playing
 *      GET  /v1/me/player/devices
 *      PUT  /v1/me/player                         (transfer playback)
 *      PUT  /v1/me/player/play
 *      PUT  /v1/me/player/pause
 *      POST /v1/me/player/next
 *      POST /v1/me/player/previous
 *      POST /v1/me/player/queue?uri=...
 *      GET  /v1/search?type=track&limit=10
 *      GET  /v1/tracks/{id}
 *      GET  /v1/artists/{id}                      (single artist — genres
 *                                                   still included; only the
 *                                                   *batch* "several artists"
 *                                                   endpoint was removed)
 *
 * 6. NO CLIENT SECRETS OR REFRESH TOKENS IN THE BROWSER, EVER.
 *    All of the above are called only from Next.js server route handlers
 *    (src/app/api/spotify/**). The browser only ever talks to OUR API,
 *    never to accounts.spotify.com or api.spotify.com directly. See
 *    lib/spotify/tokenStore.ts.
 */

export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
] as const;

export const SPOTIFY_SEARCH_MAX_LIMIT = 10;

export const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
export const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com';
