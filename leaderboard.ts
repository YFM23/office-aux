import type { LeaderboardCategory, PlayHistoryEntry, UserProfile } from '../types';

/**
 * All leaderboard categories are derived purely from office behaviour
 * (requests + ratings + timestamps) — never random, and never from Spotify
 * "popularity" (which Spotify stopped exposing to new apps in Feb 2026;
 * see lib/spotify/limitations.ts). "Hidden Gem Hunter" in particular used to
 * be an obvious fit for Spotify's popularity field — here it's redefined as
 * "highly rated songs only 1–2 people ever requested," which is arguably a
 * better fit for an office jukebox anyway.
 *
 * Negative/funny categories (Chaos Agent, Aux Hog) are intentionally framed
 * lightly in copy — see the `description` strings — per the product
 * principle of keeping this fun rather than mean.
 */

function approvalScore(entry: PlayHistoryEntry): number {
  const s = entry.ratingsSummary;
  const n = s.love + s.good + s.meh + s.skip;
  if (n === 0) return 50;
  return Math.round(((s.love * 100 + s.good * 66 + s.meh * 33) / n) * 10) / 10;
}

export function buildLeaderboard(
  users: UserProfile[],
  history: PlayHistoryEntry[]
): LeaderboardCategory[] {
  const byUser = new Map<string, PlayHistoryEntry[]>();
  for (const h of history) {
    if (!h.requestedBy) continue;
    const list = byUser.get(h.requestedBy) ?? [];
    list.push(h);
    byUser.set(h.requestedBy, list);
  }

  const nickname = (id: string) => users.find((u) => u.id === id)?.nickname ?? 'Unknown';
  const emoji = (id: string) => users.find((u) => u.id === id)?.avatarEmoji ?? '🎧';

  const officeDj = [...byUser.entries()]
    .map(([id, entries]) => ({
      userId: id,
      nickname: nickname(id),
      avatarEmoji: emoji(id),
      value: avg(entries.map(approvalScore)),
      label: `${Math.round(avg(entries.map(approvalScore)))}% avg rating`,
    }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const crowdPleaser = [...byUser.entries()]
    .map(([id, entries]) => {
      const positive = entries.filter((e) => approvalScore(e) >= 66).length;
      const pct = entries.length ? Math.round((positive / entries.length) * 100) : 0;
      return { userId: id, nickname: nickname(id), avatarEmoji: emoji(id), value: pct, label: `${pct}% positive` };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const auxHog = [...byUser.entries()]
    .map(([id, entries]) => ({
      userId: id,
      nickname: nickname(id),
      avatarEmoji: emoji(id),
      value: entries.length,
      label: `${entries.length} requests`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Hidden Gem Hunter: highly-rated tracks requested by very few distinct
  // people office-wide, credited to whoever requested it.
  const requestCountByTrack = new Map<string, number>();
  for (const h of history) {
    requestCountByTrack.set(h.track.spotifyId, (requestCountByTrack.get(h.track.spotifyId) ?? 0) + 1);
  }
  const hiddenGemHunter = [...byUser.entries()]
    .map(([id, entries]) => {
      const gems = entries.filter(
        (e) => approvalScore(e) >= 75 && (requestCountByTrack.get(e.track.spotifyId) ?? 0) <= 2
      );
      return { userId: id, nickname: nickname(id), avatarEmoji: emoji(id), value: gems.length, label: `${gems.length} hidden gems` };
    })
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const chaosAgent = [...byUser.entries()]
    .map(([id, entries]) => {
      const skips = entries.filter((e) => e.ratingsSummary.skip > (e.ratingsSummary.love + e.ratingsSummary.good)).length;
      return { userId: id, nickname: nickname(id), avatarEmoji: emoji(id), value: skips, label: `${skips} chaotic picks` };
    })
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const throwback = [...byUser.entries()]
    .map(([id, entries]) => {
      const oldOnes = entries.filter((e) => (e.track.genreGuess ?? '').includes('throwback')).length;
      return { userId: id, nickname: nickname(id), avatarEmoji: emoji(id), value: oldOnes, label: `${oldOnes} throwbacks` };
    })
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const musicExplorer = [...byUser.entries()]
    .map(([id, entries]) => {
      const genres = new Set(entries.map((e) => e.track.genreGuess ?? 'unknown'));
      return { userId: id, nickname: nickname(id), avatarEmoji: emoji(id), value: genres.size, label: `${genres.size} genres explored` };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  let mostLoved: { userId: string; nickname: string; avatarEmoji: string; value: number; label: string } | null = null;
  for (const h of history) {
    const score = approvalScore(h);
    if (!h.requestedBy) continue;
    if (!mostLoved || score > mostLoved.value) {
      mostLoved = {
        userId: h.requestedBy,
        nickname: h.requestedByNickname ?? nickname(h.requestedBy),
        avatarEmoji: emoji(h.requestedBy),
        value: score,
        label: `${h.track.name} — ${Math.round(score)}%`,
      };
    }
  }

  const categories: LeaderboardCategory[] = [
    { key: 'office_dj', title: 'Office DJ', emoji: '🏆', description: 'Highest average rating on their requests.', entries: officeDj },
    { key: 'crowd_pleaser', title: 'Crowd Pleaser', emoji: '🔥', description: 'Highest share of positively-rated requests.', entries: crowdPleaser },
    { key: 'aux_hog', title: 'Aux Hog', emoji: '🎧', description: 'Most requests overall — said with love.', entries: auxHog },
    { key: 'hidden_gem_hunter', title: 'Hidden Gem Hunter', emoji: '💎', description: 'Highly rated songs almost nobody else requested.', entries: hiddenGemHunter },
    { key: 'chaos_agent', title: 'Chaos Agent', emoji: '😈', description: 'The most confidently divisive picks — a badge of honour.', entries: chaosAgent },
    { key: 'throwback', title: 'Throwback King/Queen', emoji: '🕰', description: 'Most classic/throwback requests.', entries: throwback },
    { key: 'music_explorer', title: 'Music Explorer', emoji: '🌎', description: 'Widest spread of genres requested.', entries: musicExplorer },
    {
      key: 'most_loved_song',
      title: 'Most Loved Song',
      emoji: '❤️',
      description: 'The single best-rated request in office history.',
      entries: mostLoved ? [mostLoved] : [],
    },
  ];

  return categories;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
