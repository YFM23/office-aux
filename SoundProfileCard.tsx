import type { SoundProfile } from '@/lib/types';

export function SoundProfileCard({ nickname, profile }: { nickname: string; profile: SoundProfile }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-dial-glow bg-aux-gradient/10 px-5 py-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist-300">{nickname}'s Sound Profile</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-mist-100">{profile.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-mist-300">{profile.summary}</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/5">
        <MiniStat label="Favourite genre" value={profile.favoriteGenre ?? '—'} />
        <MiniStat label="Most requested artist" value={profile.mostRequestedArtist ?? '—'} />
        <MiniStat label="Office approval" value={`${profile.approvalRating}%`} />
        <MiniStat label="DJ rank" value={profile.djRank ? `#${profile.djRank}` : 'Unranked'} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-850 px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-wide text-mist-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-mist-100">{value}</p>
    </div>
  );
}
