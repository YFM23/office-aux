'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wordmark } from '@/components/shared/Wordmark';

export default function AdminLoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    router.replace('/admin');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-ink-950 px-6">
      <div className="mb-8 text-center">
        <Wordmark size="lg" />
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-mist-400">Admin</p>
      </div>
      <div className="card space-y-4 p-6">
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Admin passcode"
          className="w-full rounded-xl2 border border-white/10 bg-ink-900 px-4 py-3 text-mist-100 placeholder:text-mist-400/60 focus:border-dial-violet focus:outline-none"
        />
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <button onClick={submit} disabled={submitting} className="btn-primary w-full disabled:opacity-60">
          {submitting ? 'Checking…' : 'Enter admin panel'}
        </button>
      </div>
    </div>
  );
}
