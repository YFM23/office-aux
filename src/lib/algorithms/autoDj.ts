import type { RecentPlay } from './officeDjScore';
import type { VibeKey } from '../types';
import { DEFAULT_VIBES } from '../vibes';

/**
 * AUTO DJ
 * =======
 * Runs whenever the request queue is empty. Because Spotify's
 * Recommendations endpoint is blocked for new apps (see
 * lib/spotify/limitations.ts), Auto DJ can't ask Spotify "more like this."
 * Instead it:
 *   1. Picks a search query from a time-of-day rule OR the currently
 *      dominant office vibe (whichever the admin has prioritised).
 *   2. Searches Spotify's catalog with that query (a normal, always-available
 *      `GET /v1/search`).
 *   3. Filters out anything blocked, on cooldown, or played too recently.
 *   4. Prefers tracks whose artist/genre the office has historically rated
 *      well — this is OUR taste graph, built from ratings, not Spotify's.
 *
 * Admins can override the time-of-day → query mapping in
 * Admin → Auto DJ Rules.
 */

export interface TimeOfDayRule {
  label: string;
  matches: (date: Date) => boolean;
  vibeBias: VibeKey;
}

export const DEFAULT_AUTO_DJ_RULES: TimeOfDayRule[] = [
  {
    label: 'Morning',
    matches: (d) => d.getHours() >= 6 && d.getHours() < 11,
    vibeBias: 'feel_good',
  },
  {
    label: 'Focus block',
    matches: (d) => d.getHours() >= 11 && d.getHours() < 12,
    vibeBias: 'focus',
  },
  {
    label: 'Lunch',
    matches: (d) => d.getHours() >= 12 && d.getHours() < 14,
    vibeBias: 'dance',
  },
  {
    label: 'Friday afternoon',
    matches: (d) => d.getDay() === 5 && d.getHours() >= 14,
    vibeBias: 'friday',
  },
  {
    label: 'Afternoon',
    matches: (d) => d.getHours() >= 14 && d.getHours() < 18,
    vibeBias: 'hype',
  },
  {
    label: 'Default',
    matches: () => true,
    vibeBias: 'chill',
  },
];

export function currentTimeOfDayRule(rules: TimeOfDayRule[] = DEFAULT_AUTO_DJ_RULES, now = new Date()): TimeOfDayRule {
  return rules.find((r) => r.matches(now)) ?? rules[rules.length - 1]!;
}

/**
 * Picks the search query Auto DJ should use right now. Dominant vibe (if
 * one exists and vibe voting is enabled) wins over the time-of-day default,
 * since it's a more direct signal of what the room wants THIS minute.
 */
export function pickAutoDjQuery(dominantVibe: VibeKey | null, now = new Date()): { query: string; reason: string } {
  const timeRule = currentTimeOfDayRule(DEFAULT_AUTO_DJ_RULES, now);
  const vibeKey = dominantVibe ?? timeRule.vibeBias;
  const vibe = DEFAULT_VIBES.find((v) => v.key === vibeKey) ?? DEFAULT_VIBES[0]!;
  const query = vibe.seedQueries[Math.floor(Math.random() * vibe.seedQueries.length)]!;
  const reason = dominantVibe
    ? `Dominant office vibe: ${vibe.emoji} ${vibe.label}`
    : `${timeRule.label} default: ${vibe.emoji} ${vibe.label}`;
  return { query, reason };
}

/** Avoids repeating an artist that's played in the last few tracks. */
export function isTooRepetitive(artist: string, recentPlays: RecentPlay[], window = 3): boolean {
  return recentPlays.slice(0, window).some((p) => p.artist === artist);
}
