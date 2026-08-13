import type { PlayHistoryEntry, RatingValue, SoundProfile } from '../types';

/**
 * SOUND PROFILE GENERATOR
 * ========================
 * Spotify no longer lets new apps read audio features (energy, valence,
 * danceability — see lib/spotify/limitations.ts), so this is deliberately
 * NOT an audio-fingerprint classifier. It's a behavioural one: it looks at
 * what a person actually requests, how the office rates it, and when they
 * do it, and turns that into a fun, sharable identity. That also means it
 * only gets more accurate the more someone uses Office Aux — no cold start
 * guesswork from a track's BPM.
 */

function count(rec: Record<string, number>, key: string): number {
  return rec[key] ?? 0;
}

const TITLE_RULES: Array<{
  test: (ctx: ProfileInputs) => boolean;
  title: string;
  summary: (ctx: ProfileInputs) => string;
}> = [
  {
    test: (c) => count(c.genreCounts, 'pop') >= 3 && count(c.decadeCounts, '2000s') >= 2,
    title: 'Main Character Pop',
    summary: (c) =>
      `You live somewhere between 2000s nostalgia, current pop, and songs that make people accidentally start singing at their desks. Most requested: ${c.topArtist ?? 'a rotating cast of pop icons'}.`,
  },
  {
    test: (c) => count(c.genreCounts, 'throwbacks') >= 3 || count(c.decadeCounts, '2000s') + count(c.decadeCounts, '1990s') >= 4,
    title: 'Certified 2000s Pop Menace',
    summary: () => `Every queue eventually becomes a time machine when you're around. No apologies.`,
  },
  {
    test: (c) => count(c.genreCounts, 'indie') >= 2 && c.avgApproval < 60,
    title: 'Indie Sad Girl Department',
    summary: () => `Quietly devastating requests that the office is slowly learning to appreciate.`,
  },
  {
    test: (c) => count(c.genreCounts, 'dance') >= 3 || count(c.genreCounts, 'house') >= 2,
    title: 'Corporate House DJ',
    summary: () => `You've turned more than one Tuesday afternoon into an unofficial rave.`,
  },
  {
    test: (c) => count(c.genreCounts, 'rnb') >= 2,
    title: '90s R&B Loyalist',
    summary: () => `Smooth, timeless, and always the right call at 4pm.`,
  },
  {
    test: (c) => c.fridayShare > 0.4,
    title: 'Friday Afternoon Chaos Agent',
    summary: () => `Your request history has a very obvious weekly pattern, and it starts around 3:45pm on Fridays.`,
  },
  {
    test: (c) => c.topArtist?.toLowerCase().includes('taylor swift') ?? false,
    title: 'Secret Swiftie',
    summary: () => `"Secret" is doing a lot of work here — everyone already knows.`,
  },
  {
    test: (c) => count(c.genreCounts, 'acoustic') >= 2 || count(c.genreCounts, 'coffee') >= 2,
    title: 'Acoustic Coffee Shop Energy',
    summary: () => `Calm, warm, and suspiciously good for a Monday morning.`,
  },
  {
    test: (c) => count(c.genreCounts, 'rock') >= 3,
    title: 'Dad Rock Representative',
    summary: () => `Guitar solos have a place in this office, and you are its ambassador.`,
  },
  {
    test: (c) => count(c.genreCounts, 'dance') >= 2 && c.avgApproval >= 75,
    title: 'Dancefloor HR Department',
    summary: () => `Somehow every song you play gets universally approved. Suspicious. Impressive.`,
  },
];

interface ProfileInputs {
  genreCounts: Record<string, number>;
  decadeCounts: Record<string, number>;
  topArtist: string | null;
  avgApproval: number; // 0-100
  fridayShare: number; // 0-1
}

function ratingToScore(v: RatingValue): number {
  switch (v) {
    case 'love':
      return 100;
    case 'good':
      return 66;
    case 'meh':
      return 33;
    case 'skip':
      return 0;
  }
}

export function buildSoundProfile(
  userId: string,
  userHistory: PlayHistoryEntry[],
  djRank: number | null
): SoundProfile {
  const genreCounts: Record<string, number> = {};
  const decadeCounts: Record<string, number> = {};
  const artistCounts: Record<string, number> = {};
  let fridayCount = 0;
  let ratingSum = 0;
  let ratingN = 0;

  for (const entry of userHistory) {
    const genre = (entry.track.genreGuess ?? 'unknown').toLowerCase();
    genreCounts[genre] = (genreCounts[genre] ?? 0) + 1;

    const artist = entry.track.artists[0] ?? 'Unknown artist';
    artistCounts[artist] = (artistCounts[artist] ?? 0) + 1;

    const day = new Date(entry.playedAt).getDay();
    const hour = new Date(entry.playedAt).getHours();
    if (day === 5 && hour >= 14) fridayCount += 1;

    for (const [ratingKey, count] of Object.entries(entry.ratingsSummary)) {
      ratingSum += ratingToScore(ratingKey as RatingValue) * count;
      ratingN += count;
    }
  }

  const topArtist =
    Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favoriteGenre =
    Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const inputs: ProfileInputs = {
    genreCounts,
    decadeCounts,
    topArtist,
    avgApproval: ratingN > 0 ? ratingSum / ratingN : 50,
    fridayShare: userHistory.length > 0 ? fridayCount / userHistory.length : 0,
  };

  const matchedRule = TITLE_RULES.find((rule) => rule.test(inputs));
  const title = matchedRule?.title ?? 'Office Aux Wildcard';
  const summary = matchedRule
    ? matchedRule.summary(inputs)
    : `Your taste doesn't fit a neat category yet — request a few more songs and Office Aux will figure you out.`;

  return {
    userId,
    title,
    summary,
    favoriteGenre: favoriteGenre === 'unknown' ? null : favoriteGenre,
    mostRequestedArtist: topArtist,
    approvalRating: Math.round(inputs.avgApproval),
    djRank,
  };
}
