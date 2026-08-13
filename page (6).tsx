'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SoundProfileCard } from '@/components/profile/SoundProfileCard';
import type { SoundProfile, UserProfile } from '@/lib/types';

interface ProfileResponse {
  profile: UserProfile;
  soundProfile: SoundProfile;
  stats: {
    requestCount: number;
    positivePercent: number;
    mostRequestedSong: { name: string; artist: string; count: number } | null;
    mostControversialSong: { name: string; artist: string } | null;
  };
}

export default function MePage() {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [otherUsers, setOtherUsers] = useState<UserProfile[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => setMe(d.profile));
  }, []);

  useEffect(() => {
    if (!me) return;
    fetch(`/api/profile/${me.id}`)
      .then((r) => r.json())
      .then(setData);
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((d) => {
        const ids = new Set<string>();
        const users: UserProfile[] = [];
        for (const cat of d.categories ?? []) {
          for (const e of cat.entries) {
            if (e.userId !== me.id && !ids.has(e.userId)) {
              ids.add(e.userId);
              users.push({ id: e.userId, nickname: e.nickname, avatarEmoji: e.avatarEmoji, favoriteGenres: [], musicMood: null, isAdmin: false, createdAt: '' });
            }
          }
        }
        setOtherUsers(users);
      });
  }, [me?.id]);

  async function deleteProfile() {
    await fetch('/api/profile', { method: 'DELETE' });
    window.location.href = '/onboarding';
  }

  if (!me) return <div className="card h-40 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-4 p-5">
        <span className="text-4xl">{me.avatarEmoji}</span>
        <div>
          <h1 className="font-display text-lg font-bold text-mist-100">{me.nickname}</h1>
          {me.musicMood && <p className="text-sm text-mist-400">{me.musicMood}</p>}
        </div>
      </div>

      {data ? (
        <>
          <SoundProfileCard nickname={me.nickname} profile={data.soundProfile} />

          <div className="grid grid-cols-2 gap-3">
            <MiniCard label="Requests made" value={data.stats.requestCount} />
            <MiniCard label="Positively rated" value={`${data.stats.positivePercent}%`} />
          </div>

          {data.stats.mostRequestedSong && (
            <div className="card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist-400">Your most-requested song</p>
              <p className="mt-1 font-display text-base font-semibold text-mist-100">{data.stats.mostRequestedSong.name}</p>
              <p className="text-xs text-mist-400">{data.stats.mostRequestedSong.artist}</p>
            </div>
          )}

          {data.stats.mostControversialSong && (
            <div className="card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist-400">Your most controversial pick</p>
              <p className="mt-1 font-display text-base font-semibold text-mist-100">{data.stats.mostControversialSong.name}</p>
              <p className="text-xs text-mist-400">{data.stats.mostControversialSong.artist} — the office had opinions</p>
            </div>
          )}
        </>
      ) : (
        <div className="card h-40 animate-pulse" />
      )}

      {otherUsers.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-mist-300">Check your music match</h2>
          <div className="flex flex-wrap gap-2">
            {otherUsers.map((u) => (
              <Link key={u.id} href={`/profile/${u.id}`} className="pill hover:bg-white/10">
                {u.avatarEmoji} {u.nickname}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <p className="mb-2 text-sm font-medium text-mist-200">Privacy</p>
        {confirmingDelete ? (
          <div className="space-y-2">
            <p className="text-xs text-mist-400">This deletes your nickname, profile, and local session. Your past requests stay in office history, anonymised.</p>
            <div className="flex gap-2">
              <button onClick={deleteProfile} className="btn-secondary !border-signal-red/40 !text-signal-red">
                Confirm delete
              </button>
              <button onClick={() => setConfirmingDelete(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="text-xs text-mist-400 underline">
            Delete my profile
          </button>
        )}
      </div>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist-400">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-mist-100">{value}</p>
    </div>
  );
}
