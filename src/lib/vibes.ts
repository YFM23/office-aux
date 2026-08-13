import type { VibeDefinition } from './types';

// Admin can rename/reorder/disable these from Admin → Vibe Categories.
// `seedQueries` are Spotify search terms Auto DJ uses to find candidates
// when this vibe is dominant and the request queue is empty (see
// lib/algorithms/autoDj.ts). They're intentionally broad, safe-for-office
// keyword pools rather than a genre taxonomy Spotify no longer exposes to us.
export const DEFAULT_VIBES: VibeDefinition[] = [
  { key: 'feel_good', emoji: '☀️', label: 'Feel Good', active: true, seedQueries: ['feel good hits', 'sunshine pop'] },
  { key: 'hype', emoji: '🔥', label: 'Hype', active: true, seedQueries: ['hype gym anthems', 'high energy pop'] },
  { key: 'chill', emoji: '🎧', label: 'Chill', active: true, seedQueries: ['chill lofi', 'chill pop'] },
  { key: 'dance', emoji: '💃', label: 'Dance', active: true, seedQueries: ['dance pop hits', 'house classics'] },
  { key: 'throwbacks', emoji: '🪩', label: 'Throwbacks', active: true, seedQueries: ['2000s throwbacks', '90s hits'] },
  { key: 'rock', emoji: '🎸', label: 'Rock', active: true, seedQueries: ['classic rock hits', 'alt rock'] },
  { key: 'pop', emoji: '🎤', label: 'Pop', active: true, seedQueries: ['top pop hits', 'pop chart'] },
  { key: 'summer', emoji: '🌴', label: 'Summer', active: true, seedQueries: ['summer hits', 'tropical pop'] },
  { key: 'focus', emoji: '🧠', label: 'Focus', active: true, seedQueries: ['instrumental focus', 'deep focus beats'] },
  { key: 'friday', emoji: '🥂', label: 'Friday Afternoon', active: true, seedQueries: ['friday feeling', 'good vibes party'] },
  { key: 'chaos', emoji: '😈', label: 'Chaos Mode', active: true, seedQueries: ['guilty pleasure hits', 'chaotic pop bangers'] },
];

export function vibeByKey(key: string) {
  return DEFAULT_VIBES.find((v) => v.key === key) ?? null;
}
