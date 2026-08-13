import type { AdminSettings, PlayHistoryEntry, SongRequest, Track } from '../types';

export interface RequestValidationInput {
  track: Track;
  userId: string;
  admin: AdminSettings;
  pendingQueue: SongRequest[];
  nowPlayingTrackId: string | null;
  recentHistory: PlayHistoryEntry[]; // enough to cover the longest cooldown window
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Single source of truth for "can this song be requested right now?" — used
 * by both the Demo store and the Live (Supabase) route so the rules never
 * drift between the two modes. Messages come in two registers depending on
 * admin.messageTone ('professional' vs the default playful copy) per the
 * "Allow admins to configure the tone of these messages" requirement.
 */
export function validateRequest(input: RequestValidationInput): ValidationResult {
  const { track, userId, admin, pendingQueue, nowPlayingTrackId, recentHistory } = input;
  const playful = admin.messageTone !== 'professional';

  if (!admin.requestsEnabled) {
    return { ok: false, reason: 'Song requests are paused right now — check back soon.' };
  }
  if (track.explicit && !admin.explicitAllowed) {
    return {
      ok: false,
      reason: playful
        ? `That one's marked explicit and explicit content is off right now.`
        : 'Explicit content is disabled by the admin.',
    };
  }
  if (admin.blockedArtists.some((a) => track.artists.some((ta) => ta.toLowerCase() === a.toLowerCase()))) {
    return {
      ok: false,
      reason: playful ? `That artist is on a timeout from the admin. Try someone else!` : 'That artist is currently blocked.',
    };
  }
  if (track.genreGuess && admin.blockedGenres.includes(track.genreGuess)) {
    return { ok: false, reason: 'That genre is currently blocked by the admin.' };
  }
  if (admin.blockedTrackIds.includes(track.spotifyId)) {
    return { ok: false, reason: 'That specific track has been blocked by the admin.' };
  }
  if (nowPlayingTrackId === track.spotifyId) {
    return { ok: false, reason: `That's literally playing right now.` };
  }
  if (pendingQueue.some((r) => r.track.spotifyId === track.spotifyId)) {
    return {
      ok: false,
      reason: playful
        ? `${track.name} is already in the queue — go vote it up instead of doubling it!`
        : `${track.name} is already queued.`,
    };
  }

  const songCooldownMs = admin.songCooldownMinutes * 60000;
  const recentSamePlay = recentHistory.find(
    (h) => h.track.spotifyId === track.spotifyId && Date.now() - new Date(h.playedAt).getTime() < songCooldownMs
  );
  if (recentSamePlay) {
    const minsAgo = Math.round((Date.now() - new Date(recentSamePlay.playedAt).getTime()) / 60000);
    return {
      ok: false,
      reason: playful
        ? `That played ${minsAgo} min ago — give it a rest before it's back in rotation 😅`
        : `That track played ${minsAgo} minutes ago and is still on cooldown.`,
    };
  }

  const primaryArtist = track.artists[0] ?? '';
  const artistQueuedTwice = pendingQueue.filter((r) => r.track.artists[0] === primaryArtist).length >= 2;
  if (artistQueuedTwice) {
    return {
      ok: false,
      reason: playful
        ? `${primaryArtist} already has two songs in the queue — give someone else the aux for a minute 😂`
        : `${primaryArtist} already has two songs queued.`,
    };
  }

  const artistCooldownMs = admin.artistCooldownMinutes * 60000;
  const artistRecentlyPlayed = recentHistory.find(
    (h) => h.track.artists[0] === primaryArtist && Date.now() - new Date(h.playedAt).getTime() < artistCooldownMs
  );
  if (artistRecentlyPlayed) {
    return { ok: false, reason: `${primaryArtist} just played — try again in a bit.` };
  }

  const pendingFromUser = pendingQueue.filter((r) => r.requestedBy === userId).length;
  if (pendingFromUser >= admin.maxActiveRequestsPerPerson) {
    return {
      ok: false,
      reason: playful
        ? `You've already got ${pendingFromUser} songs waiting — let the queue catch up with you first!`
        : `You already have the maximum of ${admin.maxActiveRequestsPerPerson} pending requests.`,
    };
  }

  return { ok: true };
}
