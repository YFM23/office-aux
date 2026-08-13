'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wordmark, Tagline } from '@/components/shared/Wordmark';

const EMOJIS = ['🎧', '🎸', '🪩', '🎤', '☕', '🔥', '😈', '🌮', '🌴', '🧠', '🥂', '🎹'];
const GENRES = ['Pop', 'Dance', 'Rock', 'Hip-Hop', 'R&B', 'Throwbacks', 'Focus', 'Acoustic'];

function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [nickname, setNickname] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]!);
  const [genres, setGenres] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 3 ? [...prev, g] : prev));
  }

  async function submit() {
    if (!nickname.trim()) {
      setError('Give yourself a nickname first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, avatarEmoji: emoji, favoriteGenres: genres, musicMood: mood || null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    router.replace(next);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <Wordmark size="lg" />
        <Tagline className="mt-2" />
      </div>

      <div className="card space-y-6 p-6">
        <div>
          <h1 className="font-display text-lg font-semibold text-mist-100">Join the jukebox</h1>
          <p className="mt-1 text-sm text-mist-400">No Spotify login needed — just a nickname so the office knows whose taste to blame.</p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-mist-400">Pick an avatar</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex h-11 w-11 items-center justify-center rounded-xl2 border text-xl transition ${
                  emoji === e ? 'border-dial-violet bg-dial-violet/20' : 'border-white/10 bg-white/5'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-mist-400">Nickname</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            placeholder="e.g. Yvanna"
            className="w-full rounded-xl2 border border-white/10 bg-ink-900 px-4 py-3 text-mist-100 placeholder:text-mist-400/60 focus:border-dial-violet focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-mist-400">Favourite genres (optional, up to 3)</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`pill transition ${genres.includes(g) ? 'border-dial-violet bg-dial-violet/20 text-mist-100' : ''}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-mist-400">Music mood (optional)</label>
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            maxLength={60}
            placeholder="e.g. main character energy"
            className="w-full rounded-xl2 border border-white/10 bg-ink-900 px-4 py-3 text-mist-100 placeholder:text-mist-400/60 focus:border-dial-violet focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-signal-red">{error}</p>}

        <button onClick={submit} disabled={submitting} className="btn-primary w-full disabled:opacity-60">
          {submitting ? 'Joining…' : "Let's go"}
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
