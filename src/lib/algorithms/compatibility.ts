import type { PlayHistoryEntry } from '../types';

export interface CompatibilityResult {
  percent: number;
  sharedGenres: string[];
  biggestDisagreement: string | null;
}

/**
 * Compares two people's actual request/genre behaviour (never random) using
 * a simple weighted Jaccard-style overlap over genre request frequency, plus
 * a penalty for genres one person loves that the other's ratings suggest
 * they dislike (their "biggest disagreement").
 */
export function computeCompatibility(
  aHistory: PlayHistoryEntry[],
  bHistory: PlayHistoryEntry[]
): CompatibilityResult {
  const aGenres = genreShare(aHistory);
  const bGenres = genreShare(bHistory);

  const allGenres = new Set([...aGenres.keys(), ...bGenres.keys()]);
  let overlap = 0;
  let total = 0;
  const shared: string[] = [];
  let worstGap = 0;
  let worstGenre: string | null = null;

  for (const genre of allGenres) {
    const a = aGenres.get(genre) ?? 0;
    const b = bGenres.get(genre) ?? 0;
    overlap += Math.min(a, b);
    total += Math.max(a, b);
    if (a > 0.12 && b > 0.12) shared.push(genre);

    const gap = Math.abs(a - b);
    if (gap > worstGap && (a > 0.15 || b > 0.15)) {
      worstGap = gap;
      worstGenre = genre;
    }
  }

  const percent = total === 0 ? 50 : Math.round((overlap / total) * 100);

  return {
    percent,
    sharedGenres: shared.slice(0, 3).map(titleCase),
    biggestDisagreement: worstGenre ? titleCase(worstGenre) : null,
  };
}

function genreShare(history: PlayHistoryEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of history) {
    const genre = (entry.track.genreGuess ?? 'unknown').toLowerCase();
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  const total = history.length || 1;
  for (const [k, v] of counts) counts.set(k, v / total);
  return counts;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
