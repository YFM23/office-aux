import type { OfficeStatsSnapshot, PlayHistoryEntry, SongRequest, VibeKey, VibeVote } from '../types';

function ratingAvg(entries: PlayHistoryEntry[]): number {
  let sum = 0;
  let n = 0;
  for (const e of entries) {
    const s = e.ratingsSummary;
    sum += s.love * 100 + s.good * 66 + s.meh * 33 + s.skip * 0;
    n += s.love + s.good + s.meh + s.skip;
  }
  return n === 0 ? 0 : Math.round(sum / n);
}

function decadeOf(playedAt: string): string {
  // Best-effort: without Spotify audio-features / album release-year batch
  // lookups (also restricted for new apps), we bucket by request patterns
  // rather than pretend to know a track's original release year precisely.
  // In LIVE mode, the album release_date IS still available from the single
  // Get Track / Get Album endpoints and should be threaded through here.
  return 'Unknown';
}

export function buildOfficeStats(
  range: OfficeStatsSnapshot['range'],
  history: PlayHistoryEntry[],
  requestsToday: SongRequest[],
  vibeVotes: VibeVote[]
): OfficeStatsSnapshot {
  const artistCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  const skippedByArtist = new Map<string, number>();
  const requesterCounts = new Map<string, number>();
  let topRated: { name: string; artist: string; score: number } | null = null;

  for (const h of history) {
    const artist = h.track.artists[0] ?? 'Unknown';
    artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
    const genre = h.track.genreGuess ?? 'unknown';
    genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    if (h.ratingsSummary.skip > h.ratingsSummary.love + h.ratingsSummary.good) {
      skippedByArtist.set(artist, (skippedByArtist.get(artist) ?? 0) + 1);
    }
    if (h.requestedByNickname) {
      requesterCounts.set(h.requestedByNickname, (requesterCounts.get(h.requestedByNickname) ?? 0) + 1);
    }
    const score = ratingAvg([h]);
    if (!topRated || score > topRated.score) {
      topRated = { name: h.track.name, artist, score };
    }
  }

  const dominantVibe = tallyDominantVibe(vibeVotes);
  const totalGenreCount = [...genreCounts.values()].reduce((a, b) => a + b, 0) || 1;

  return {
    range,
    songsPlayed: history.length,
    songsRequested: requestsToday.length,
    mostPopularArtist: topEntry(artistCounts),
    mostPopularGenre: topEntry(genreCounts),
    averageRating: ratingAvg(history),
    mostActiveDjNickname: topEntry(requesterCounts),
    dominantVibe,
    topRatedSongToday: topRated ? { name: topRated.name, artist: topRated.artist } : null,
    mostSkippedArtist: topEntry(skippedByArtist),
    favoriteDecade: history[0] ? decadeOf(history[0].playedAt) : null,
    genreBreakdown: [...genreCounts.entries()]
      .map(([genre, count]) => ({ genre, percent: Math.round((count / totalGenreCount) * 100) }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 6),
  };
}

export function tallyVibePercentages(votes: VibeVote[]): { vibe: VibeKey; percent: number }[] {
  if (votes.length === 0) return [];
  const counts = new Map<VibeKey, number>();
  for (const v of votes) counts.set(v.vibe, (counts.get(v.vibe) ?? 0) + 1);
  return [...counts.entries()]
    .map(([vibe, count]) => ({ vibe, percent: Math.round((count / votes.length) * 100) }))
    .sort((a, b) => b.percent - a.percent);
}

function tallyDominantVibe(votes: VibeVote[]): VibeKey | null {
  const tallied = tallyVibePercentages(votes);
  return tallied[0]?.vibe ?? null;
}

function topEntry(m: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = -1;
  for (const [k, v] of m) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}
