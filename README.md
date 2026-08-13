# Office Aux 🎧

**Your office. Your music.**

A social office jukebox that connects to one host's Spotify Premium account.
The host controls real playback on the office speakers; everyone else joins
from their phone with just a nickname — no Spotify login required — to
request songs, vote on the queue, set the office vibe, and watch a
leaderboard of who has the best (and most chaotic) taste in the building.

This app runs in one of two modes, auto-detected from environment variables:

- **Demo Mode** — zero configuration. Seeded fake office, simulated
  playback clock, full UI. Run `npm install && npm run dev` and it just
  works.
- **Live Mode** — real Spotify playback + Supabase-backed data, once you've
  set up the env vars below.

---

## 1. Architecture

```
┌─────────────────────┐        ┌──────────────────────────┐
│   Team member's     │        │   Admin's browser        │
│   phone (no login)  │        │   (passcode-gated /admin)│
└──────────┬───────────┘        └───────────┬──────────────┘
           │  fetch()                        │ fetch()
           ▼                                 ▼
   ┌─────────────────────────────────────────────────────┐
   │           Next.js App Router (this repo)            │
   │  ┌─────────────┐   ┌───────────────┐  ┌────────────┐ │
   │  │   Pages      │   │  API routes    │  │ Middleware │ │
   │  │ (client      │──▶│ (server-only,  │  │ (admin-only│ │
   │  │  components, │   │  validate +    │  │  route     │ │
   │  │  polling)    │   │  branch on     │  │  guard)    │ │
   │  └─────────────┘   │  isDemoMode()) │  └────────────┘ │
   └──────────────────────────┬───────────────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
       ┌───────────────────┐       ┌───────────────────────┐
       │  DEMO: in-memory   │       │  LIVE: Supabase        │
       │  module singleton  │       │  (Postgres + Realtime) │
       │  (src/lib/demo)    │       │  + Spotify Web API     │
       └───────────────────┘       │  (server-side only,     │
                                    │  host account tokens)   │
                                    └───────────────────────┘
```

Key decisions:

- **The browser never talks to Spotify or Supabase directly for writes.**
  Every mutation goes through a Next.js Route Handler in `src/app/api/**`,
  which is where cooldowns, request limits, blocklists, and admin checks are
  enforced — once, consistently, regardless of mode.
- **Only the host authenticates with Spotify.** Team members never see a
  Spotify login screen. This is also why Spotify's tightened "development
  mode" (5 authenticated users max, allowlist-based — see §4) is a non-issue
  here: this app only ever needs one.
- **Demo and Live share the same algorithms.** `src/lib/algorithms/*` (Office
  DJ Score, Sound Profiles, Compatibility, Leaderboard, Stats, Auto DJ) are
  pure functions with no dependency on Supabase or Spotify. Both the demo
  store and the live Supabase routes call the exact same code, so behaviour
  never drifts between modes.

### Directory guide

```
src/
  app/                     Pages (App Router) + all API routes
    api/spotify/...        Playback, search, OAuth — server-only
    api/requests, votes,   App data mutations — branch on isDemoMode()
        ratings, ...
    admin/                 Passcode-gated admin panel
    party/                 Full-screen TV display
  components/              UI, grouped by feature area
  lib/
    algorithms/            Office DJ Score, Sound Profile, Compatibility,
                            Leaderboard, Stats, Auto DJ — pure, documented
    demo/                  In-memory Demo Mode store + seed data
    spotify/                Spotify Web API client + token storage + the
                            documented API limitations (read this first)
    supabase/               Server/browser Supabase clients + row mappers
    types.ts                Shared domain types
supabase/migrations/        Full Postgres schema + RLS policies
```

---

## 2. Database schema (Live Mode)

See `supabase/migrations/0001_init.sql` for the full, commented schema.
Summary of tables:

| Table | Purpose |
|---|---|
| `users` | Nickname-only team profiles (no real names/emails required) |
| `spotify_tracks` | Cached track metadata, keyed by Spotify track ID |
| `song_requests` | Pending queue (played/rejected rows move elsewhere) |
| `song_votes` | One row per (request, user) — upvote/downvote |
| `now_playing_sessions` | One row per "this specific play," so ratings/skip-votes scope correctly even if the same song plays twice in a day |
| `song_ratings` | One rating per (session, user) — `unique` constraint prevents spam |
| `skip_votes` | One vote per (session, user) |
| `vibe_votes` | One active vote per user (primary key on `user_id`, overwritten on re-vote) |
| `vibe_definitions` | Admin-editable vibe categories |
| `play_history` | Permanent record everything else is computed from |
| `social_moments` | Small live notification feed |
| `admin_settings` | Single-row table of all admin toggles |
| `blocked_tracks` / `blocked_artists` | Explicit blocklists |
| `spotify_tokens` | **Server-only.** No RLS policy grants any role access — only the service-role key (used exclusively in route handlers) can read it. |

Row Level Security is enabled everywhere; anon/browser access is read-only,
and all writes go through the API layer.

---

## 3. Page structure

| Route | Purpose |
|---|---|
| `/` | Now Playing — art, progress, ratings, skip-vote banner, vibe summary, up-next preview |
| `/request` | Search Spotify + full ranked queue with voting |
| `/vibe` | "What's the Vibe?" voting grid with live percentages |
| `/stats` | Office-wide stats dashboard (today/week/month/all-time) |
| `/leaderboard` | All fun leaderboard categories |
| `/history` | Full play history with range filters + "play again" |
| `/me` | Your Sound Profile, personal stats, privacy controls |
| `/profile/[id]` | Someone else's Sound Profile + Music Compatibility |
| `/party` | Full-screen TV display for the office speaker area |
| `/onboarding` | First-visit nickname/avatar/genre setup |
| `/admin` (passcode-gated) | Spotify connect, device picker, playback controls, all moderation settings, blocklists, QR code, stats reset |

Mobile uses a bottom nav (`Playing / Request / Vibe / Stats / Me`); desktop
uses a sidebar with the same items plus Leaderboard, History, Party Mode,
Admin.

---

## 4. Spotify integration — what's real, and its limitations

**This section reflects Spotify's actual, current Web API rules (checked
against Spotify's own developer changelog as of August 2026), not
assumptions from older tutorials.** They shaped real architectural
decisions in this app — read `src/lib/spotify/limitations.ts` for the full
detail with inline rationale. Short version:

1. **No algorithmic recommendations for new apps.** Since Nov 2024, Spotify
   blocks new apps from `Recommendations`, `Audio Features`, `Audio
   Analysis`, and `Related Artists`. **Auto DJ does not call Spotify for
   "similar songs."** Instead it searches Spotify's catalog using
   vibe/time-of-day keyword pools and prefers what *this office* has rated
   well historically. **Sound Profiles are behavioural, not audio-feature
   based** — built from request/rating/timing patterns, not a BPM/energy
   fingerprint Spotify no longer lets us read.
2. **February 2026 catalog cuts** additionally removed `Artist Top Tracks`,
   `New Releases`, `Browse Categories`, batch "get several X" endpoints, and
   the `popularity`/`followers` fields. There is no Spotify-provided
   "hidden gem" score anymore — the **Hidden Gem Hunter** leaderboard
   category is computed purely from office data instead (highly-rated
   tracks almost nobody else requested).
3. **Search results are capped at 10** (`GET /v1/search`'s `limit` ceiling
   dropped from 50). The request search UI reflects this.
4. **Development Mode's 5-user cap is a non-issue.** Only the host
   authenticates with Spotify — team members never do. A single-host
   jukebox sits comfortably inside that cap forever, and "Extended quota"
   (which now requires a 250k-MAU organization) is irrelevant here.
5. **The one real operational catch:** the Spotify account used to register
   *and* authorize the app needs an active **Premium** subscription, or
   playback control silently stops working.
6. **Spotify has no API to reorder or clear its own playback queue** — only
   `GET`/`POST` to append one item. That's why Office Aux keeps its own
   ranked queue in Postgres and, when a track finishes or a skip vote
   passes threshold, tells Spotify to start the winning pick directly via
   `PUT /me/player/play` with an explicit URI, rather than trying to keep
   Spotify's native queue in sync with live votes (see
   `src/app/api/queue/tick/route.ts` for the full explanation).

Playback surface actually used (all server-side, all still available):
`GET/PUT /me/player`, `GET /me/player/currently-playing`, `GET
/me/player/devices`, `PUT /me/player/play|pause`, `POST
/me/player/next`, `POST /me/player/queue`, `GET /search`, `GET
/artists/{id}` (single — for best-effort genre tags; the *batch* endpoint is
one of the removed ones).

Client secrets and refresh tokens are never sent to the browser — see
`src/lib/spotify/tokenStore.ts` and the `spotify_tokens` RLS policy (or lack
thereof, by design).

---

## 5. Setup

### Demo Mode (default, zero config)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. That's it — 8 seeded office profiles, a live
queue, vibe votes, and 40+ history entries are ready to explore. Visit
`/admin/login` with the passcode from `ADMIN_PASSCODE` (defaults are in
`.env.example` — set a real one before deploying anywhere shared).

### Live Mode

1. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - Run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase
     db push` if you're using the CLI).
   - Copy the Project URL, anon key, and service role key into `.env.local`.

2. **Spotify**
   - Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard),
     using an account with an active **Premium** subscription (required —
     see §4).
   - Add a Redirect URI matching `SPOTIFY_REDIRECT_URI` exactly, e.g.
     `https://your-domain.com/api/spotify/auth/callback`.
   - Copy the Client ID and Client Secret into `.env.local`.
   - The app stays in Spotify's Development Mode indefinitely — no
     extended-quota application needed (see §4, point 4).

3. **Admin passcode** — set `ADMIN_PASSCODE` to something real.

4. Deploy (Vercel is the easiest target for a Next.js app) and set the same
   env vars there.

5. From `/admin`, click **Connect Spotify**, authorize with the host
   account, then open Spotify on the office speakers and pick that device
   under **Playback device**.

6. **Queue Tick** — Live Mode needs something to periodically call `POST
   /api/queue/tick`, which is what actually advances playback to the next
   ranked request (see §4, point 6). Two options:
   - Leave `/party` open on an office TV/monitor — it polls this endpoint
     every 12s on its own.
   - Add a Vercel Cron Job (or any scheduler) hitting `POST
     /api/queue/tick` every 10–15 seconds for reliability independent of
     any tab being open.

---

## 6. The Office DJ Score algorithm

Queue ranking blends five signals — votes, wait time, requester fairness,
artist/genre repetition, and a same-requester cooldown — so one person or
one genre can't dominate, while still rewarding what the room actually
votes for. Full formula and rationale, with inline comments explaining each
term: `src/lib/algorithms/officeDjScore.ts`.

---

## 7. Demo Mode implementation note

Demo Mode's state lives in a module-level singleton
(`src/lib/demo/store.ts`) — perfect for `next dev` or a normal long-running
Node host (`next start`), where it persists across requests with zero
database setup. On a cold-start serverless platform, each instance gets its
own copy; that's an acceptable trade for a zero-config demo, and it's
exactly the gap Live Mode (Supabase) exists to close. Playback is simulated
lazily: every read checks whether the current track's duration has
elapsed and, if so, advances the queue — no background worker required.

---

## 8. Privacy & moderation

- Team profiles are nickname + emoji only — no real names, emails, or
  passwords collected.
- `/me` includes a self-serve "Delete my profile" control (past requests
  stay in history, but anonymized once the profile is gone).
- Admin can reset office-wide stats (`/admin` → Danger Zone) without
  deleting anyone's profile.
- Explicit content, specific tracks, artists, and genres are all
  independently blockable from `/admin`.

---

## 9. What's genuinely tested vs. illustrative

Every Demo Mode code path in this repo has been exercised end-to-end
(profile creation, search, request validation and its friendly rejection
messages, voting, rating spam-prevention, vibe voting, skip votes, admin
settings, leaderboard, stats, compatibility, sound profiles, and the QR
code) against a running dev server — this isn't just a UI mockup.

The **Live Mode** Supabase/Spotify code paths are written to the same
contracts and mirror the demo logic exactly (see `requestValidation.ts`,
shared by both), but obviously can't be exercised against a real Spotify
account or Supabase project from this environment. Treat them as a
complete, correct-by-construction starting point — worth a real read-through
before your first production deploy, same as any integration you haven't
personally run against live credentials yet.
