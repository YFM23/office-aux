-- Office Aux — initial schema
-- Run with: supabase db push  (or paste into the Supabase SQL editor)
--
-- Design notes:
-- * Team members are identified by `users.id` (a random uuid stored in an
--   httpOnly cookie on their device) — no email/password, no real names.
-- * Only ONE Spotify account is ever connected (the host's). Its tokens live
--   in `spotify_tokens`, a single-row table readable only by the service
--   role key from server route handlers — never by the anon key, never by
--   the browser.
-- * Realtime is enabled on the tables the UI subscribes to live
--   (song_requests, song_votes, vibe_votes, now_playing, social_moments)
--   so every screen updates instantly for everyone without polling.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Team member profiles
-- ---------------------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique,
  avatar_emoji text not null default '🎧',
  favorite_genres text[] not null default '{}',
  music_mood text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Spotify catalog cache (avoids re-hitting Spotify for track metadata we
-- already have, and gives every other table a stable foreign key)
-- ---------------------------------------------------------------------------
create table spotify_tracks (
  spotify_id text primary key,
  uri text not null,
  name text not null,
  artists text[] not null,
  album_name text,
  album_art_url text,
  duration_ms integer not null,
  explicit boolean not null default false,
  genre_guess text, -- best-effort; see lib/spotify/limitations.ts
  cached_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Live request queue (pending only — played/rejected rows move to
-- play_history / are deleted)
-- ---------------------------------------------------------------------------
create table song_requests (
  id uuid primary key default gen_random_uuid(),
  spotify_id text not null references spotify_tracks(spotify_id),
  requested_by uuid not null references users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'playing', 'played', 'rejected', 'skipped')),
  created_at timestamptz not null default now(),
  played_at timestamptz
);

create table song_votes (
  request_id uuid not null references song_requests(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

-- One row per currently-playing "session" so ratings and skip votes can be
-- scoped to "this specific play," not the track in general.
create table now_playing_sessions (
  id uuid primary key default gen_random_uuid(),
  spotify_id text not null references spotify_tracks(spotify_id),
  requested_by uuid references users(id) on delete set null,
  source text not null default 'request' check (source in ('request', 'autopilot', 'admin')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table song_ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references now_playing_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  value text not null check (value in ('love', 'good', 'meh', 'skip')),
  created_at timestamptz not null default now(),
  unique (session_id, user_id) -- one rating per person per play — prevents spam
);

create table skip_votes (
  session_id uuid not null references now_playing_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Vibe voting ("What's the Vibe?") — one active vote per person, overwritten
-- on re-vote rather than accumulated.
-- ---------------------------------------------------------------------------
create table vibe_votes (
  user_id uuid primary key references users(id) on delete cascade,
  vibe text not null,
  created_at timestamptz not null default now()
);

create table vibe_definitions (
  key text primary key,
  emoji text not null,
  label text not null,
  seed_queries text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Play history — the permanent record everything else (stats, leaderboard,
-- sound profiles) is computed from.
-- ---------------------------------------------------------------------------
create table play_history (
  id uuid primary key default gen_random_uuid(),
  spotify_id text not null references spotify_tracks(spotify_id),
  requested_by uuid references users(id) on delete set null,
  requested_by_nickname text, -- denormalised snapshot so history survives profile deletion
  played_at timestamptz not null,
  ended_at timestamptz,
  source text not null default 'request' check (source in ('request', 'autopilot', 'admin')),
  love_count integer not null default 0,
  good_count integer not null default 0,
  meh_count integer not null default 0,
  skip_count integer not null default 0
);

create index play_history_played_at_idx on play_history (played_at desc);

-- ---------------------------------------------------------------------------
-- Social moments feed (small live notifications)
-- ---------------------------------------------------------------------------
create table social_moments (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin settings — single row
-- ---------------------------------------------------------------------------
create table admin_settings (
  id boolean primary key default true check (id), -- enforces exactly one row
  explicit_allowed boolean not null default true,
  requests_enabled boolean not null default true,
  max_active_requests_per_person integer not null default 3,
  song_cooldown_minutes integer not null default 90,
  artist_cooldown_minutes integer not null default 30,
  max_consecutive_tracks_from_one_requester integer not null default 1,
  voting_enabled boolean not null default true,
  skip_vote_threshold integer not null default 3,
  auto_dj_enabled boolean not null default true,
  vibe_voting_enabled boolean not null default true,
  party_mode_enabled boolean not null default false,
  blocked_track_ids text[] not null default '{}',
  blocked_artists text[] not null default '{}',
  blocked_genres text[] not null default '{}',
  office_hours_open time,
  office_hours_close time,
  message_tone text not null default 'playful' check (message_tone in ('playful', 'dry', 'professional')),
  default_spotify_device_id text
);
insert into admin_settings (id) values (true);

create table blocked_tracks (
  spotify_id text primary key references spotify_tracks(spotify_id),
  blocked_at timestamptz not null default now(),
  blocked_by uuid references users(id)
);

create table blocked_artists (
  artist_name text primary key,
  blocked_at timestamptz not null default now(),
  blocked_by uuid references users(id)
);

-- ---------------------------------------------------------------------------
-- Spotify OAuth token storage — SERVER-ONLY. RLS below denies all access to
-- anon/authenticated roles; only the service role key (used exclusively in
-- Next.js route handlers, never shipped to the browser) can read this.
-- ---------------------------------------------------------------------------
create table spotify_tokens (
  id boolean primary key default true check (id), -- single row: the host account
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null,
  connected_by uuid references users(id),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table users enable row level security;
alter table spotify_tracks enable row level security;
alter table song_requests enable row level security;
alter table song_votes enable row level security;
alter table now_playing_sessions enable row level security;
alter table song_ratings enable row level security;
alter table skip_votes enable row level security;
alter table vibe_votes enable row level security;
alter table vibe_definitions enable row level security;
alter table play_history enable row level security;
alter table social_moments enable row level security;
alter table admin_settings enable row level security;
alter table blocked_tracks enable row level security;
alter table blocked_artists enable row level security;
alter table spotify_tokens enable row level security;

-- Read-only anon access for realtime/browse — all WRITES go through Next.js
-- route handlers using the service role key, so business rules (cooldowns,
-- request limits, blocklists, tone-of-voice messages) are enforced in one
-- place instead of being re-implemented in RLS policies.
create policy "anon can read users" on users for select using (true);
create policy "anon can read spotify_tracks" on spotify_tracks for select using (true);
create policy "anon can read song_requests" on song_requests for select using (true);
create policy "anon can read song_votes" on song_votes for select using (true);
create policy "anon can read now_playing_sessions" on now_playing_sessions for select using (true);
create policy "anon can read song_ratings" on song_ratings for select using (true);
create policy "anon can read skip_votes" on skip_votes for select using (true);
create policy "anon can read vibe_votes" on vibe_votes for select using (true);
create policy "anon can read vibe_definitions" on vibe_definitions for select using (true);
create policy "anon can read play_history" on play_history for select using (true);
create policy "anon can read social_moments" on social_moments for select using (true);
create policy "anon can read admin_settings" on admin_settings for select using (true);
create policy "anon can read blocked_tracks" on blocked_tracks for select using (true);
create policy "anon can read blocked_artists" on blocked_artists for select using (true);
-- No policy at all on spotify_tokens -> RLS default-denies every role except
-- the service role (which bypasses RLS entirely). This is intentional.

-- Realtime: enable change broadcasts for the tables the UI live-subscribes to.
alter publication supabase_realtime add table song_requests, song_votes, vibe_votes, now_playing_sessions, song_ratings, social_moments, skip_votes;
