import type { PlayHistoryEntry, Track, UserProfile } from '../types';

export function rowToTrack(row: any): Track {
  return {
    spotifyId: row.spotify_id,
    uri: row.uri,
    name: row.name,
    artists: row.artists,
    albumName: row.album_name,
    albumArtUrl: row.album_art_url,
    durationMs: row.duration_ms,
    explicit: row.explicit,
    genreGuess: row.genre_guess,
    previewUrl: null,
  };
}

export function rowToHistoryEntry(row: any): PlayHistoryEntry {
  return {
    id: row.id,
    track: rowToTrack(row.spotify_tracks),
    requestedBy: row.requested_by,
    requestedByNickname: row.requested_by_nickname,
    playedAt: row.played_at,
    endedAt: row.ended_at,
    source: row.source,
    ratingsSummary: { love: row.love_count, good: row.good_count, meh: row.meh_count, skip: row.skip_count },
  };
}

export function rowToUser(row: any): UserProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    avatarEmoji: row.avatar_emoji,
    favoriteGenres: row.favorite_genres ?? [],
    musicMood: row.music_mood,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
  };
}
