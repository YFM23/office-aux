// Core domain types shared across the app, the demo data provider, and the
// Supabase-backed data provider. Keeping these in one place means both
// providers are interchangeable behind `getDataProvider()`.

export type UUID = string;

export interface Track {
  spotifyId: string; // Spotify track ID (not a full URI)
  uri: string; // spotify:track:xxxx
  name: string;
  artists: string[];
  albumName: string;
  albumArtUrl: string | null;
  durationMs: number;
  explicit: boolean;
  /** Best-effort genre tags. Spotify no longer exposes reliable per-track
   * genres for new apps (see lib/spotify/limitations.ts), so this is derived
   * from the requester's tagged genre, the artist's cached genre (when we
   * looked it up previously), or "unknown". */
  genreGuess: string | null;
  previewUrl: string | null; // usually null post Nov-2024 API changes
}

export type VibeKey =
  | 'feel_good'
  | 'hype'
  | 'chill'
  | 'dance'
  | 'throwbacks'
  | 'rock'
  | 'pop'
  | 'summer'
  | 'focus'
  | 'friday'
  | 'chaos';

export interface VibeDefinition {
  key: VibeKey;
  emoji: string;
  label: string;
  /** Search seed terms used to find candidate tracks for Auto DJ when this
   * vibe is dominant (see lib/algorithms/autoDj.ts). */
  seedQueries: string[];
  active: boolean;
}

export interface UserProfile {
  id: UUID;
  nickname: string;
  avatarEmoji: string;
  favoriteGenres: string[];
  musicMood: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export type RequestStatus = 'queued' | 'playing' | 'played' | 'rejected' | 'skipped';

export interface SongRequest {
  id: UUID;
  track: Track;
  requestedBy: UUID;
  requestedByNickname: string;
  status: RequestStatus;
  createdAt: string;
  playedAt: string | null;
  votes: number; // net upvotes - downvotes
  /** Computed on the fly, not stored — see officeDjScore.ts */
  officeDjScore?: number;
}

export type VoteValue = 1 | -1;

export interface SongVote {
  requestId: UUID;
  userId: UUID;
  value: VoteValue;
}

export type RatingValue = 'love' | 'good' | 'meh' | 'skip';

export interface SongRating {
  id: UUID;
  trackSpotifyId: string;
  historyEntryId: UUID | null;
  userId: UUID;
  value: RatingValue;
  createdAt: string;
}

export interface VibeVote {
  userId: UUID;
  vibe: VibeKey;
  createdAt: string;
}

export interface PlayHistoryEntry {
  id: UUID;
  track: Track;
  requestedBy: UUID | null;
  requestedByNickname: string | null;
  playedAt: string;
  endedAt: string | null;
  source: 'request' | 'autopilot' | 'admin';
  ratingsSummary: Record<RatingValue, number>;
}

export interface SkipVoteState {
  requestId: UUID;
  votes: UUID[]; // user ids who voted to skip
  threshold: number;
}

export interface AdminSettings {
  explicitAllowed: boolean;
  requestsEnabled: boolean;
  maxActiveRequestsPerPerson: number;
  songCooldownMinutes: number;
  artistCooldownMinutes: number;
  maxConsecutiveTracksFromOneRequester: number;
  votingEnabled: boolean;
  skipVoteThreshold: number;
  autoDjEnabled: boolean;
  vibeVotingEnabled: boolean;
  partyModeEnabled: boolean;
  blockedTrackIds: string[];
  blockedArtists: string[];
  blockedGenres: string[];
  officeHours: { open: string; close: string } | null;
  messageTone: 'playful' | 'dry' | 'professional';
  defaultSpotifyDeviceId: string | null;
}

export interface SoundProfile {
  userId: UUID;
  title: string; // e.g. "Main Character Pop"
  summary: string;
  favoriteGenre: string | null;
  mostRequestedArtist: string | null;
  approvalRating: number; // 0-100
  djRank: number | null;
}

export interface LeaderboardEntry {
  userId: UUID;
  nickname: string;
  avatarEmoji: string;
  value: number;
  label: string; // formatted display value, e.g. "87% positive"
}

export interface LeaderboardCategory {
  key: string;
  title: string;
  emoji: string;
  description: string;
  entries: LeaderboardEntry[];
}

export interface OfficeStatsSnapshot {
  range: 'today' | 'week' | 'month' | 'all';
  songsPlayed: number;
  songsRequested: number;
  mostPopularArtist: string | null;
  mostPopularGenre: string | null;
  averageRating: number; // 0-100 scale (love=100, good=66, meh=33, skip=0)
  mostActiveDjNickname: string | null;
  dominantVibe: VibeKey | null;
  topRatedSongToday: { name: string; artist: string } | null;
  mostSkippedArtist: string | null;
  favoriteDecade: string | null;
  genreBreakdown: { genre: string; percent: number }[];
}

export interface NowPlayingState {
  isPlaying: boolean;
  track: Track | null;
  progressMs: number;
  requestedByNickname: string | null;
  officeRating: number | null; // rolling average rating % for this track today
  device: { id: string; name: string; volumePercent: number | null } | null;
  sessionId?: string;
}

export interface SocialMoment {
  id: UUID;
  text: string;
  createdAt: string;
}
