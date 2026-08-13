import { randomUUID } from 'crypto';
import type {
  AdminSettings,
  NowPlayingState,
  PlayHistoryEntry,
  RatingValue,
  SocialMoment,
  SongRating,
  SongRequest,
  SongVote,
  Track,
  UserProfile,
  VibeKey,
  VibeVote,
} from '../types';
import { DEMO_TRACKS, DEMO_USERS } from './seedData';
import { rankQueue, type RecentPlay } from '../algorithms/officeDjScore';
import { pickAutoDjQuery, isTooRepetitive } from '../algorithms/autoDj';
import { validateRequest } from '../algorithms/requestValidation';

// ---------------------------------------------------------------------------
// This is a module-level singleton. In Next.js `dev` / a long-running Node
// server (e.g. `next start` on a normal host) this module is loaded once and
// state survives across requests, which is exactly what Demo Mode needs — no
// database required. On a cold-start serverless platform the store resets
// per instance; that's an acceptable trade for a zero-config demo, and it's
// exactly the boundary LIVE mode (Supabase) is built to remove. See README.
// ---------------------------------------------------------------------------

interface NowPlayingInternal {
  track: Track;
  startedAt: number; // epoch ms
  requestedBy: string | null;
  requestedByNickname: string | null;
  source: 'request' | 'autopilot' | 'admin';
  sessionId: string;
  historyId: string;
}

interface DemoState {
  initialized: boolean;
  users: UserProfile[];
  requests: SongRequest[]; // pending only
  history: PlayHistoryEntry[]; // most recent first
  votes: SongVote[];
  ratings: SongRating[]; // keyed by historyEntryId when attached to history
  vibeVotes: VibeVote[];
  skipVotes: Map<string, Set<string>>; // sessionId -> set of userIds
  socialMoments: SocialMoment[];
  isPlaying: boolean;
  nowPlaying: NowPlayingInternal | null;
  admin: AdminSettings;
  device: { id: string; name: string; volumePercent: number } | null;
}

const g = globalThis as unknown as { __officeAuxDemo?: DemoState };

function freshAdminSettings(): AdminSettings {
  return {
    explicitAllowed: true,
    requestsEnabled: true,
    maxActiveRequestsPerPerson: 3,
    songCooldownMinutes: 90,
    artistCooldownMinutes: 30,
    maxConsecutiveTracksFromOneRequester: 1,
    votingEnabled: true,
    skipVoteThreshold: 3,
    autoDjEnabled: true,
    vibeVotingEnabled: true,
    partyModeEnabled: false,
    blockedTrackIds: [],
    blockedArtists: [],
    blockedGenres: [],
    officeHours: null,
    messageTone: 'playful',
    defaultSpotifyDeviceId: null,
  };
}

function seed(): DemoState {
  const now = Date.now();
  const users: UserProfile[] = DEMO_USERS.map((u, i) => ({
    ...u,
    id: `demo-user-${i + 1}`,
    createdAt: new Date(now - (30 - i) * 86400000).toISOString(),
  }));

  const state: DemoState = {
    initialized: true,
    users,
    requests: [],
    history: [],
    votes: [],
    ratings: [],
    vibeVotes: [],
    skipVotes: new Map(),
    socialMoments: [],
    isPlaying: true,
    nowPlaying: null,
    admin: freshAdminSettings(),
    device: { id: 'demo-device', name: 'Office Speakers (Demo)', volumePercent: 65 },
  };

  // Seed ~40 history entries spread over the last 10 days so Stats,
  // Leaderboard, and Sound Profiles have something real to compute from.
  const historyLength = 42;
  for (let i = 0; i < historyLength; i++) {
    const track = DEMO_TRACKS[Math.floor(Math.random() * DEMO_TRACKS.length)]!;
    const requester = users[Math.floor(Math.random() * users.length)]!;
    const playedAt = now - (historyLength - i) * (35 * 60 * 1000) - Math.floor(Math.random() * 600000);
    const ratingsSummary = randomRatingsSummary();
    state.history.push({
      id: randomUUID(),
      track,
      requestedBy: requester.id,
      requestedByNickname: requester.nickname,
      playedAt: new Date(playedAt).toISOString(),
      endedAt: new Date(playedAt + track.durationMs).toISOString(),
      source: 'request',
      ratingsSummary,
    });
  }
  state.history.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());

  // Seed a small live queue.
  const queueSeeds = [DEMO_TRACKS[2]!, DEMO_TRACKS[8]!, DEMO_TRACKS[18]!, DEMO_TRACKS[4]!];
  queueSeeds.forEach((track, idx) => {
    const requester = users[(idx + 2) % users.length]!;
    state.requests.push({
      id: randomUUID(),
      track,
      requestedBy: requester.id,
      requestedByNickname: requester.nickname,
      status: 'queued',
      createdAt: new Date(now - (queueSeeds.length - idx) * 4 * 60000).toISOString(),
      playedAt: null,
      votes: Math.floor(Math.random() * 5) - 1,
    });
  });

  // Seed vibe votes so "What's the Vibe" has live percentages immediately.
  const vibePool: VibeKey[] = ['hype', 'throwbacks', 'chill', 'hype', 'dance', 'hype', 'pop', 'throwbacks'];
  users.forEach((u, i) => {
    state.vibeVotes.push({ userId: u.id, vibe: vibePool[i % vibePool.length]!, createdAt: new Date(now - i * 60000).toISOString() });
  });

  // Kick off Now Playing with the top of the seeded queue.
  const first = state.requests.shift();
  if (first) {
    state.nowPlaying = {
      track: first.track,
      startedAt: now - 35000, // already 35s in, so the UI shows a live progress bar immediately
      requestedBy: first.requestedBy,
      requestedByNickname: first.requestedByNickname,
      source: 'request',
      sessionId: randomUUID(),
      historyId: randomUUID(),
    };
  }

  state.socialMoments.push(
    { id: randomUUID(), text: `${users[2]!.nickname} just requested ${DEMO_TRACKS[10]!.name}.`, createdAt: new Date(now - 120000).toISOString() },
    { id: randomUUID(), text: `Hype has taken the lead in the office vibe vote.`, createdAt: new Date(now - 60000).toISOString() }
  );

  return state;
}

function randomRatingsSummary(): Record<RatingValue, number> {
  const total = 2 + Math.floor(Math.random() * 5);
  const weights = [0.4, 0.35, 0.18, 0.07]; // love, good, meh, skip — skewed positive like a real office
  const result: Record<RatingValue, number> = { love: 0, good: 0, meh: 0, skip: 0 };
  const keys: RatingValue[] = ['love', 'good', 'meh', 'skip'];
  for (let i = 0; i < total; i++) {
    const r = Math.random();
    let acc = 0;
    for (let k = 0; k < keys.length; k++) {
      acc += weights[k]!;
      if (r <= acc) {
        result[keys[k]!] += 1;
        break;
      }
    }
  }
  return result;
}

function getStore(): DemoState {
  if (!g.__officeAuxDemo) {
    g.__officeAuxDemo = seed();
  }
  return g.__officeAuxDemo;
}

/** Advances the simulated clock: finishes the current track if its duration
 * has elapsed, records it to history, and pulls the next track from the
 * ranked queue (or Auto DJ if the queue is empty). Call this at the top of
 * every read/write so state is always consistent without a background
 * worker. */
function tick() {
  const s = getStore();
  if (!s.nowPlaying || !s.isPlaying) return;

  const elapsed = Date.now() - s.nowPlaying.startedAt;
  if (elapsed < s.nowPlaying.track.durationMs) return;

  finishCurrentTrack(s);
  advanceQueue(s);
}

function finishCurrentTrack(s: DemoState) {
  if (!s.nowPlaying) return;
  const np = s.nowPlaying;
  const ratingsForSession = s.ratings.filter((r) => r.historyEntryId === np.historyId);
  const summary: Record<RatingValue, number> = { love: 0, good: 0, meh: 0, skip: 0 };
  for (const r of ratingsForSession) summary[r.value] += 1;

  s.history.unshift({
    id: np.historyId,
    track: np.track,
    requestedBy: np.requestedBy,
    requestedByNickname: np.requestedByNickname,
    playedAt: new Date(np.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    source: np.source,
    ratingsSummary: summary,
  });
  s.skipVotes.delete(np.sessionId);
  s.nowPlaying = null;
}

function recentPlaysList(s: DemoState): RecentPlay[] {
  return s.history.slice(0, 6).map((h) => ({
    requestedBy: h.requestedBy,
    artist: h.track.artists[0] ?? '',
    genre: h.track.genreGuess,
  }));
}

function advanceQueue(s: DemoState) {
  const recent = recentPlaysList(s);

  if (s.requests.length > 0) {
    const ranked = rankQueue(s.requests, recent);
    const next = ranked[0]!;
    s.requests = s.requests.filter((r) => r.id !== next.id);
    startNowPlaying(s, next.track, next.requestedBy, next.requestedByNickname, 'request');
    return;
  }

  if (!s.admin.autoDjEnabled) return;

  // Auto DJ: pick from the vibe/time-of-day query pool, filtered against
  // recent plays so we don't repeat an artist back-to-back. Demo Mode
  // "searches" the local seed catalog instead of the live Spotify API.
  const dominant = dominantVibeKey(s);
  const { query } = pickAutoDjQuery(dominant);
  const candidates = DEMO_TRACKS.filter((tr) => !isTooRepetitive(tr.artists[0] ?? '', recent, 2));
  const matchByGenre = candidates.filter((tr) => query.toLowerCase().includes(tr.genreGuess ?? '___'));
  const pool = matchByGenre.length > 0 ? matchByGenre : candidates;
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? DEMO_TRACKS[0]!;
  startNowPlaying(s, pick, null, null, 'autopilot');
}

function dominantVibeKey(s: DemoState): VibeKey | null {
  if (s.vibeVotes.length === 0) return null;
  const counts = new Map<VibeKey, number>();
  for (const v of s.vibeVotes) counts.set(v.vibe, (counts.get(v.vibe) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function startNowPlaying(
  s: DemoState,
  track: Track,
  requestedBy: string | null,
  requestedByNickname: string | null,
  source: 'request' | 'autopilot' | 'admin'
) {
  s.nowPlaying = {
    track,
    startedAt: Date.now(),
    requestedBy,
    requestedByNickname,
    source,
    sessionId: randomUUID(),
    historyId: randomUUID(),
  };
  if (requestedByNickname) {
    pushSocialMoment(s, `${requestedByNickname}'s request is now playing.`);
  }
}

function pushSocialMoment(s: DemoState, text: string) {
  s.socialMoments.unshift({ id: randomUUID(), text, createdAt: new Date().toISOString() });
  s.socialMoments = s.socialMoments.slice(0, 20);
}

// ---------------------------------------------------------------------------
// Public API used by route handlers
// ---------------------------------------------------------------------------

export function getNowPlaying(): NowPlayingState {
  tick();
  const s = getStore();
  if (!s.nowPlaying) {
    return { isPlaying: false, track: null, progressMs: 0, requestedByNickname: null, officeRating: null, device: null };
  }
  const progressMs = Math.min(Date.now() - s.nowPlaying.startedAt, s.nowPlaying.track.durationMs);
  const liveRatings = s.ratings.filter((r) => r.historyEntryId === s.nowPlaying!.historyId);
  const officeRating = liveRatings.length > 0 ? computeApproval(liveRatings.map((r) => r.value)) : null;

  return {
    isPlaying: s.isPlaying,
    track: s.nowPlaying.track,
    progressMs,
    requestedByNickname: s.nowPlaying.requestedByNickname,
    officeRating,
    device: s.device ? { id: s.device.id, name: s.device.name, volumePercent: s.device.volumePercent } : null,
    sessionId: s.nowPlaying.sessionId,
  };
}

function computeApproval(values: RatingValue[]): number {
  const score = { love: 100, good: 66, meh: 33, skip: 0 };
  const sum = values.reduce((a, v) => a + score[v], 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function getCurrentSessionId(): string | null {
  tick();
  return getStore().nowPlaying?.sessionId ?? null;
}

export function listQueue(): SongRequest[] {
  tick();
  const s = getStore();
  return rankQueue(s.requests, recentPlaysList(s));
}

export function listUsers(): UserProfile[] {
  return getStore().users;
}

export function getUser(userId: string): UserProfile | null {
  return getStore().users.find((u) => u.id === userId) ?? null;
}

export function createProfile(nickname: string, avatarEmoji: string, favoriteGenres: string[], musicMood: string | null): UserProfile {
  const s = getStore();
  const existing = s.users.find((u) => u.nickname.toLowerCase() === nickname.toLowerCase());
  if (existing) return existing;
  const profile: UserProfile = {
    id: randomUUID(),
    nickname,
    avatarEmoji,
    favoriteGenres,
    musicMood,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
  s.users.push(profile);
  return profile;
}

export function searchTracks(query: string): Track[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DEMO_TRACKS.filter(
    (t) => t.name.toLowerCase().includes(q) || t.artists.some((a) => a.toLowerCase().includes(q))
  ).slice(0, 10); // mirrors Spotify's current hard cap of 10 search results
}

export type RequestOutcome = { ok: true; request: SongRequest } | { ok: false; reason: string };

export function createRequest(userId: string, spotifyTrackId: string): RequestOutcome {
  tick();
  const s = getStore();
  const user = getUser(userId);
  if (!user) return { ok: false, reason: 'We couldn\u2019t find your profile — try refreshing the page.' };

  const track = DEMO_TRACKS.find((t) => t.spotifyId === spotifyTrackId);
  if (!track) return { ok: false, reason: 'That track could not be found.' };

  const verdict = validateRequest({
    track,
    userId,
    admin: s.admin,
    pendingQueue: s.requests,
    nowPlayingTrackId: s.nowPlaying?.track.spotifyId ?? null,
    recentHistory: s.history,
  });
  if (!verdict.ok) return { ok: false, reason: verdict.reason };

  const request: SongRequest = {
    id: randomUUID(),
    track,
    requestedBy: userId,
    requestedByNickname: user.nickname,
    status: 'queued',
    createdAt: new Date().toISOString(),
    playedAt: null,
    votes: 0,
  };
  s.requests.push(request);
  pushSocialMoment(s, `${user.nickname} just requested ${track.name}.`);
  return { ok: true, request };
}

export function voteRequest(requestId: string, userId: string, value: 1 | -1): { ok: boolean; reason?: string } {
  const s = getStore();
  const req = s.requests.find((r) => r.id === requestId);
  if (!req) return { ok: false, reason: 'That request is no longer in the queue.' };

  const existing = s.votes.find((v) => v.requestId === requestId && v.userId === userId);
  if (existing) {
    if (existing.value === value) return { ok: true }; // no-op, already voted this way
    req.votes += value * 2; // remove old vote's effect, apply new
    existing.value = value;
  } else {
    s.votes.push({ requestId, userId, value });
    req.votes += value;
  }

  if (req.votes >= 5) pushSocialMoment(s, `${req.requestedByNickname}'s request just hit ${req.votes} upvotes.`);
  return { ok: true };
}

export function rateNowPlaying(userId: string, value: RatingValue): { ok: boolean; reason?: string } {
  tick();
  const s = getStore();
  if (!s.nowPlaying) return { ok: false, reason: 'Nothing is playing right now.' };
  const already = s.ratings.find((r) => r.historyEntryId === s.nowPlaying!.historyId && r.userId === userId);
  if (already) return { ok: false, reason: 'You already rated this song.' };

  s.ratings.push({
    id: randomUUID(),
    trackSpotifyId: s.nowPlaying.track.spotifyId,
    historyEntryId: s.nowPlaying.historyId,
    userId,
    value,
    createdAt: new Date().toISOString(),
  });

  if (value === 'skip' && s.admin.votingEnabled) {
    castSkipVote(s.nowPlaying.sessionId, userId);
  }
  return { ok: true };
}

function castSkipVote(sessionId: string, userId: string) {
  const s = getStore();
  const set = s.skipVotes.get(sessionId) ?? new Set<string>();
  set.add(userId);
  s.skipVotes.set(sessionId, set);
  if (set.size >= s.admin.skipVoteThreshold) {
    finishCurrentTrack(s);
    advanceQueue(s);
  }
}

export function getSkipVoteState(): { sessionId: string; votes: number; threshold: number } | null {
  tick();
  const s = getStore();
  if (!s.nowPlaying) return null;
  const set = s.skipVotes.get(s.nowPlaying.sessionId) ?? new Set<string>();
  return { sessionId: s.nowPlaying.sessionId, votes: set.size, threshold: s.admin.skipVoteThreshold };
}

export function castExplicitSkipVote(userId: string): { ok: boolean; reason?: string } {
  tick();
  const s = getStore();
  if (!s.nowPlaying) return { ok: false, reason: 'Nothing is playing right now.' };
  if (!s.admin.votingEnabled) return { ok: false, reason: 'Skip voting is turned off.' };
  const set = s.skipVotes.get(s.nowPlaying.sessionId) ?? new Set<string>();
  if (set.has(userId)) return { ok: false, reason: 'You already voted to skip this one.' };
  castSkipVote(s.nowPlaying.sessionId, userId);
  return { ok: true };
}

export function castVibeVote(userId: string, vibe: VibeKey): void {
  const s = getStore();
  const existing = s.vibeVotes.find((v) => v.userId === userId);
  if (existing) existing.vibe = vibe;
  else s.vibeVotes.push({ userId, vibe, createdAt: new Date().toISOString() });
}

export function listVibeVotes(): VibeVote[] {
  return getStore().vibeVotes;
}

export function listHistory(): PlayHistoryEntry[] {
  tick();
  return getStore().history;
}

export function listSocialMoments(): SocialMoment[] {
  tick();
  return getStore().socialMoments;
}

export function getAdminSettings(): AdminSettings {
  return getStore().admin;
}

export function updateAdminSettings(patch: Partial<AdminSettings>): AdminSettings {
  const s = getStore();
  s.admin = { ...s.admin, ...patch };
  return s.admin;
}

export function adminSkip(): void {
  tick();
  const s = getStore();
  if (!s.nowPlaying) return;
  finishCurrentTrack(s);
  advanceQueue(s);
}

export function adminSetPlaying(playing: boolean): void {
  const s = getStore();
  s.isPlaying = playing;
  if (s.nowPlaying) {
    // Re-baseline startedAt so progress doesn't jump when resuming.
    const progressSoFar = Date.now() - s.nowPlaying.startedAt;
    if (playing) s.nowPlaying.startedAt = Date.now() - progressSoFar;
  }
}

export function adminRemoveRequest(requestId: string): void {
  const s = getStore();
  s.requests = s.requests.filter((r) => r.id !== requestId);
}

export function resetOfficeStats(): void {
  g.__officeAuxDemo = seed();
}
