import type { SongRequest } from '../types';

/**
 * OFFICE DJ SCORE
 * ================
 * This is the ranking function behind the Democratic Queue. It answers one
 * question for every pending request: "how soon should this play?"
 *
 * A pure "most votes wins" queue sounds democratic but breaks down fast in
 * an office of 15 people: the loudest 3 people brigade-vote their favourite
 * artist, the same genre plays for two hours straight, and whoever requested
 * first never gets a turn if a louder song is requested five minutes later.
 * Office DJ Score fixes that by blending five signals instead of one:
 *
 *   1. VOTES        — what the room actually wants right now.
 *   2. WAIT TIME     — fairness. A song sitting in queue for 20 minutes with
 *                      only two upvotes should eventually beat a brand new
 *                      request with three, or people learn "request late."
 *   3. REQUESTER      — a light per-person diminishing return so one person
 *      FAIRNESS         can't fill the whole queue. Someone's 4th pending
 *                      request is worth less than their 1st.
 *   4. ARTIST/GENRE   — repetition penalty. Discourages three Taylor Swift
 *      REPETITION       songs or three "hype" tracks back-to-back, without
 *                      banning an artist outright.
 *   5. JUST-PLAYED     — if this requester's song JUST finished playing,
 *      COOLDOWN          nudge their next one down slightly so other people
 *                       get a turn before they go again.
 *
 * The result is a single number. Sort descending, and the top request plays
 * next. Nothing here silently removes a request — a song with a rough score
 * still eventually rises as it waits, which is the point: everyone gets a
 * fair shot at the aux without the queue turning into chaos.
 *
 * Tunable weights live in `OFFICE_DJ_WEIGHTS` below — the admin's "queue
 * behaviour" settings map onto these.
 */

export const OFFICE_DJ_WEIGHTS = {
  votes: 6, // points per net upvote
  waitMinutes: 1.4, // points per minute waited (fairness ramp)
  waitCapMinutes: 30, // wait bonus stops growing after this long
  requesterPendingPenalty: 8, // points removed per OTHER pending request the same person already has
  sameArtistRecentPenalty: 25, // points removed if this artist played in the last N history slots
  sameGenrePenalty: 10, // points removed if this genre played in the last N history slots
  justPlayedSameRequesterPenalty: 18, // points removed if this requester's track just finished
  recentWindow: 4, // how many recently-played tracks count as "recent" for repetition checks
} as const;

export interface RecentPlay {
  requestedBy: string | null;
  artist: string;
  genre: string | null;
}

interface ScoreContext {
  /** All currently-pending requests, used to compute per-requester fairness penalties. */
  pendingByRequester: Map<string, number>;
  /** Last few tracks played, most recent first. */
  recentPlays: RecentPlay[];
  now: number; // Date.now()
}

export function buildScoreContext(
  pending: SongRequest[],
  recentPlaysMostRecentFirst: RecentPlay[]
): ScoreContext {
  const pendingByRequester = new Map<string, number>();
  for (const r of pending) {
    pendingByRequester.set(r.requestedBy, (pendingByRequester.get(r.requestedBy) ?? 0) + 1);
  }
  return {
    pendingByRequester,
    recentPlays: recentPlaysMostRecentFirst.slice(0, OFFICE_DJ_WEIGHTS.recentWindow),
    now: Date.now(),
  };
}

export function officeDjScore(request: SongRequest, ctx: ScoreContext): number {
  const w = OFFICE_DJ_WEIGHTS;
  let score = 0;

  // 1. Votes — the clearest, most direct signal of "the room wants this."
  score += request.votes * w.votes;

  // 2. Wait time — ramps up linearly, then flattens so a request that's been
  // sitting for hours doesn't hit an absurd score; it just guarantees a
  // strong position rather than an unbeatable one.
  const waitMinutes = (ctx.now - new Date(request.createdAt).getTime()) / 60000;
  score += Math.min(waitMinutes, w.waitCapMinutes) * w.waitMinutes;

  // 3. Requester fairness — penalise each ADDITIONAL pending request from the
  // same person. Their first request pays no penalty; their second pays one
  // unit, third pays two units, etc., so a prolific requester's queue still
  // plays, just interleaved with everyone else's.
  const otherPendingFromSameRequester = Math.max(
    0,
    (ctx.pendingByRequester.get(request.requestedBy) ?? 1) - 1
  );
  score -= otherPendingFromSameRequester * w.requesterPendingPenalty;

  // 4. Artist/genre repetition — look at the last few tracks actually played
  // in the office (not the whole day) and discourage doubling up.
  const primaryArtist = request.track.artists[0] ?? '';
  const genre = request.track.genreGuess;
  const recentArtistMatch = ctx.recentPlays.some((p) => p.artist === primaryArtist);
  const recentGenreMatch = genre != null && ctx.recentPlays.some((p) => p.genre === genre);
  if (recentArtistMatch) score -= w.sameArtistRecentPenalty;
  if (recentGenreMatch) score -= w.sameGenrePenalty;

  // 5. Just-played cooldown — if the very last track was requested by the
  // same person, nudge them down so someone else's song gets the next slot.
  const lastPlay = ctx.recentPlays[0];
  if (lastPlay && lastPlay.requestedBy === request.requestedBy) {
    score -= w.justPlayedSameRequesterPenalty;
  }

  return Math.round(score * 10) / 10;
}

/** Ranks pending requests, attaching `officeDjScore` and sorting highest first. */
export function rankQueue(pending: SongRequest[], recentPlaysMostRecentFirst: RecentPlay[]): SongRequest[] {
  const ctx = buildScoreContext(pending, recentPlaysMostRecentFirst);
  return [...pending]
    .map((r) => ({ ...r, officeDjScore: officeDjScore(r, ctx) }))
    .sort((a, b) => (b.officeDjScore ?? 0) - (a.officeDjScore ?? 0));
}
