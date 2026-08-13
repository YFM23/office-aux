'use client';

import { useEffect, useState } from 'react';
import { SoundProfileCard } from '@/components/profile/SoundProfileCard';
import { CompatibilityCard } from '@/components/profile/CompatibilityCard';
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

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch('/api/profile').then((r) => r.json()).then((d) => setMe(d.profile));
    fetch(`/api/profile/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) {
    return <p className="text-sm text-mist-400">That profile doesn't exist — they may have deleted it.</p>;
  }
  if (!data) return <div className="card h-40 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-4 p-5">
        <span className="text-4xl">{data.profile.avatarEmoji}</span>
        <div>
          <h1 className="font-display text-lg font-bold text-mist-100">{data.profile.nickname}</h1>
          {data.profile.musicMood && <p className="text-sm text-mist-400">{data.profile.musicMood}</p>}
        </div>
      </div>

      <SoundProfileCard nickname={data.profile.nickname} profile={data.soundProfile} />

      <div className="grid grid-cols-2 gap-3">
        <MiniCard label="Requests made" value={data.stats.requestCount} />
        <MiniCard label="Positively rated" value={`${data.stats.positivePercent}%`} />
      </div>

      {me && me.id !== data.profile.id && (
        <CompatibilityCard myId={me.id} myNickname={me.nickname} otherId={data.profile.id} otherNickname={data.profile.nickname} />
      )}
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
