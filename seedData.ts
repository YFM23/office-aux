import type { Track, UserProfile } from '../types';

// Demo Mode seed catalog. Track/artist names are factual metadata (the same
// kind of information Spotify's own search would return) — no lyrics or
// copyrighted text appear anywhere in this file.
export const DEMO_TRACKS: Track[] = [
  t('4nP4pRq7g2sJ01', 'Espresso', ['Sabrina Carpenter'], "Short n' Sweet", 210000, false, 'pop'),
  t('4nP4pRq7g2sJ02', 'Flowers', ['Miley Cyrus'], 'Endless Summer Vacation', 200000, false, 'pop'),
  t('4nP4pRq7g2sJ03', 'As It Was', ['Harry Styles'], "Harry's House", 167000, false, 'pop'),
  t('4nP4pRq7g2sJ04', 'Levitating', ['Dua Lipa'], 'Future Nostalgia', 203000, false, 'dance'),
  t('4nP4pRq7g2sJ05', 'Blinding Lights', ['The Weeknd'], 'After Hours', 200000, false, 'dance'),
  t('4nP4pRq7g2sJ06', 'Uptown Funk', ['Mark Ronson', 'Bruno Mars'], 'Uptown Special', 270000, false, 'throwbacks'),
  t('4nP4pRq7g2sJ07', 'Mr. Brightside', ['The Killers'], 'Hot Fuss', 222000, false, 'rock'),
  t('4nP4pRq7g2sJ08', "Don't Stop Believin'", ['Journey'], 'Escape', 251000, false, 'rock'),
  t('4nP4pRq7g2sJ09', 'Cruel Summer', ['Taylor Swift'], 'Lover', 178000, false, 'pop'),
  t('4nP4pRq7g2sJ10', 'Anti-Hero', ['Taylor Swift'], 'Midnights', 200000, false, 'pop'),
  t('4nP4pRq7g2sJ11', 'Murder On The Dancefloor', ['Sophie Ellis-Bextor'], 'Read My Lips', 234000, false, 'dance'),
  t('4nP4pRq7g2sJ12', 'Good 4 U', ['Olivia Rodrigo'], 'Sour', 178000, true, 'pop'),
  t('4nP4pRq7g2sJ13', 'Get Lucky', ['Daft Punk', 'Pharrell Williams'], 'Random Access Memories', 248000, false, 'dance'),
  t('4nP4pRq7g2sJ14', 'Rock Your Body', ['Justin Timberlake'], 'Justified', 267000, false, 'throwbacks'),
  t('4nP4pRq7g2sJ15', 'HUMBLE.', ['Kendrick Lamar'], 'DAMN.', 177000, true, 'hiphop'),
  t('4nP4pRq7g2sJ16', 'Say My Name', ["Destiny's Child"], 'The Writing\'s on the Wall', 271000, false, 'rnb'),
  t('4nP4pRq7g2sJ17', 'No Diggity', ['Blackstreet'], 'Another Level', 309000, false, 'rnb'),
  t('4nP4pRq7g2sJ18', 'Weightless', ['Marconi Union'], 'Weightless', 480000, false, 'focus'),
  t('4nP4pRq7g2sJ19', 'Sunroof', ['Nicky Youre', 'dazy'], 'Sunroof', 163000, false, 'summer'),
  t('4nP4pRq7g2sJ20', 'Vampire', ['Olivia Rodrigo'], 'Guts', 219000, false, 'pop'),
  t('4nP4pRq7g2sJ21', 'Feels', ['Calvin Harris', 'Pharrell Williams'], 'Funk Wav Bounces Vol. 1', 220000, false, 'summer'),
  t('4nP4pRq7g2sJ22', 'Fields of Gold', ['Sting'], 'Ten Summoner\'s Tales', 218000, false, 'acoustic'),
  t('4nP4pRq7g2sJ23', 'Wonderwall', ['Oasis'], "(What's the Story) Morning Glory?", 258000, false, 'rock'),
  t('4nP4pRq7g2sJ24', 'Chasing Cars', ['Snow Patrol'], 'Eyes Open', 268000, false, 'acoustic'),
  t('4nP4pRq7g2sJ25', 'Dancing Queen', ['ABBA'], 'Arrival', 230000, false, 'throwbacks'),
];

function t(
  spotifyId: string,
  name: string,
  artists: string[],
  albumName: string,
  durationMs: number,
  explicit: boolean,
  genreGuess: string
): Track {
  return {
    spotifyId,
    uri: `spotify:track:${spotifyId}`,
    name,
    artists,
    albumName,
    albumArtUrl: null, // Demo Mode has no real Spotify art; UI shows a generated gradient tile instead.
    durationMs,
    explicit,
    genreGuess,
    previewUrl: null,
  };
}

export const DEMO_USERS: Omit<UserProfile, 'id' | 'createdAt'>[] = [
  { nickname: 'Yvanna', avatarEmoji: '🌮', favoriteGenres: ['pop', 'dance'], musicMood: 'main character energy', isAdmin: true },
  { nickname: 'Marcus', avatarEmoji: '🎸', favoriteGenres: ['rock'], musicMood: 'dad rock forever', isAdmin: false },
  { nickname: 'Priya', avatarEmoji: '🪩', favoriteGenres: ['dance', 'throwbacks'], musicMood: 'always dancing', isAdmin: false },
  { nickname: 'Deshawn', avatarEmoji: '🎤', favoriteGenres: ['hiphop', 'rnb'], musicMood: 'smooth operator', isAdmin: false },
  { nickname: 'Amelia', avatarEmoji: '☕', favoriteGenres: ['acoustic', 'focus'], musicMood: 'quiet coffee shop', isAdmin: false },
  { nickname: 'Jonah', avatarEmoji: '🔥', favoriteGenres: ['pop', 'summer'], musicMood: 'hype machine', isAdmin: false },
  { nickname: 'Sofia', avatarEmoji: '🎧', favoriteGenres: ['pop'], musicMood: 'secret swiftie', isAdmin: false },
  { nickname: 'Tom', avatarEmoji: '😈', favoriteGenres: ['throwbacks'], musicMood: 'chaos on a Friday', isAdmin: false },
];
