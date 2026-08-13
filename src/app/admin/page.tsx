'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wordmark } from '@/components/shared/Wordmark';
import { ToggleRow, NumberRow, ChipListEditor, SectionCard } from '@/components/admin/Controls';
import type { AdminSettings } from '@/lib/types';

interface Device {
  id: string;
  name: string;
  isActive?: boolean;
  volumePercent: number | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [mode, setMode] = useState<{ demoMode: boolean; spotifyConnected: boolean } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectingDevice, setSelectingDevice] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setJoinUrl(window.location.origin);
    fetch('/api/admin/whoami')
      .then((r) => r.json())
      .then((d) => {
        if (!d.isAdmin) {
          router.replace('/admin/login');
        } else {
          setAuthChecked(true);
        }
      });
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    fetch('/api/admin/settings').then((r) => r.json()).then((d) => setSettings(d.settings));
    fetch('/api/mode').then((r) => r.json()).then(setMode);
    fetch('/api/spotify/devices').then((r) => r.json()).then((d) => setDevices(d.devices ?? []));
  }, [authChecked]);

  async function patch(partial: Partial<AdminSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev));
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (res.ok) {
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(null), 1500);
    }
  }

  async function playbackAction(action: 'play' | 'pause' | 'skip') {
    await fetch(`/api/spotify/${action}`, { method: 'POST' });
  }

  async function selectDevice(deviceId: string) {
    setSelectingDevice(deviceId);
    const res = await fetch('/api/spotify/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    setSelectingDevice(null);
    if (res.ok) {
      setDevices((prev) => prev.map((d) => ({ ...d, isActive: d.id === deviceId })));
      setSaveMessage('Playback device set');
      setTimeout(() => setSaveMessage(null), 1500);
    } else {
      setSaveMessage('Could not switch devices');
      setTimeout(() => setSaveMessage(null), 2000);
    }
  }

  async function logout() {
    await fetch('/api/admin/session', { method: 'DELETE' });
    router.replace('/admin/login');
  }

  async function resetStats() {
    if (!confirm('Reset all office stats, history, ratings, and votes? Team profiles stay intact.')) return;
    await fetch('/api/admin/reset', { method: 'POST' });
    setSaveMessage('Office stats reset');
    setTimeout(() => setSaveMessage(null), 2000);
  }

  if (!authChecked || !settings) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="card h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 pb-16">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-ink-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Wordmark size="sm" />
          <span className="pill">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && <span className="text-xs text-signal-green">{saveMessage}</span>}
          <Link href="/" className="text-xs text-mist-400 hover:text-mist-200">
            View app →
          </Link>
          <button onClick={logout} className="text-xs text-mist-500 hover:text-signal-red">
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <SectionCard title="Spotify connection">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-mist-100">
                {mode?.demoMode ? 'Demo Mode' : mode?.spotifyConnected ? 'Connected' : 'Not connected'}
              </p>
              <p className="text-xs text-mist-500">
                {mode?.demoMode
                  ? 'Set SUPABASE_* and SPOTIFY_* env vars to leave Demo Mode.'
                  : 'The host Spotify Premium account controlling office playback.'}
              </p>
            </div>
            {!mode?.demoMode && (
              <a href="/api/spotify/auth/login" className="btn-secondary !px-3 !py-2 text-xs">
                {mode?.spotifyConnected ? 'Reconnect' : 'Connect Spotify'}
              </a>
            )}
          </div>

          <div className="py-3">
            <p className="mb-2 text-sm font-medium text-mist-100">Playback device</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {devices.map((d) => (
                <button
                  key={d.id}
                  onClick={() => selectDevice(d.id)}
                  disabled={selectingDevice === d.id}
                  className={`pill transition hover:bg-white/10 ${d.isActive ? 'border-dial-violet bg-dial-violet/10' : ''} ${selectingDevice === d.id ? 'opacity-60' : ''}`}
                >
                  {d.isActive && '🔊 '}
                  {selectingDevice === d.id ? 'Switching…' : d.name}
                </button>
              ))}
              {devices.length === 0 && <span className="text-xs text-mist-500">No devices found — open Spotify on the office speakers first, then refresh this page.</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => playbackAction('play')} className="btn-secondary !px-3 !py-2 text-xs">▶ Play</button>
              <button onClick={() => playbackAction('pause')} className="btn-secondary !px-3 !py-2 text-xs">⏸ Pause</button>
              <button onClick={() => playbackAction('skip')} className="btn-secondary !px-3 !py-2 text-xs">⏭ Skip</button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Join the jukebox">
          <div className="flex items-center gap-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qrcode?url=${encodeURIComponent(joinUrl)}`} alt="QR code to join" className="h-28 w-28 rounded-lg bg-white p-2" />
            <div>
              <p className="text-sm text-mist-200">Scan to join — no Spotify login required.</p>
              <p className="mt-1 break-all font-mono text-xs text-mist-500">{joinUrl}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Requests & moderation">
          <ToggleRow label="Song requests" description="Let team members request songs." checked={settings.requestsEnabled} onChange={(v) => patch({ requestsEnabled: v })} />
          <ToggleRow label="Explicit content" description="Allow explicit-tagged tracks." checked={settings.explicitAllowed} onChange={(v) => patch({ explicitAllowed: v })} />
          <NumberRow label="Max active requests per person" value={settings.maxActiveRequestsPerPerson} onChange={(v) => patch({ maxActiveRequestsPerPerson: v })} />
          <NumberRow label="Song cooldown" value={settings.songCooldownMinutes} onChange={(v) => patch({ songCooldownMinutes: v })} suffix="min" />
          <NumberRow label="Artist cooldown" value={settings.artistCooldownMinutes} onChange={(v) => patch({ artistCooldownMinutes: v })} suffix="min" />
          <NumberRow
            label="Max consecutive tracks / requester"
            value={settings.maxConsecutiveTracksFromOneRequester}
            onChange={(v) => patch({ maxConsecutiveTracksFromOneRequester: v })}
          />
        </SectionCard>

        <SectionCard title="Voting & queue">
          <ToggleRow label="Voting enabled" description="Upvote/downvote in the request queue." checked={settings.votingEnabled} onChange={(v) => patch({ votingEnabled: v })} />
          <NumberRow label="Skip vote threshold" value={settings.skipVoteThreshold} onChange={(v) => patch({ skipVoteThreshold: v })} suffix="votes" />
          <ToggleRow label="Vibe voting" checked={settings.vibeVotingEnabled} onChange={(v) => patch({ vibeVotingEnabled: v })} />
          <ToggleRow label="Auto DJ" description="Keeps music playing when the queue is empty." checked={settings.autoDjEnabled} onChange={(v) => patch({ autoDjEnabled: v })} />
          <ToggleRow label="Party Mode" description="Bigger art, louder voting, TV-friendly display." checked={settings.partyModeEnabled} onChange={(v) => patch({ partyModeEnabled: v })} />
        </SectionCard>

        <SectionCard title="Message tone">
          <div className="flex gap-2 py-3">
            {(['playful', 'dry', 'professional'] as const).map((tone) => (
              <button
                key={tone}
                onClick={() => patch({ messageTone: tone })}
                className={`rounded-full px-3 py-1.5 text-xs capitalize transition ${
                  settings.messageTone === tone ? 'bg-aux-gradient text-white' : 'border border-white/10 text-mist-400'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Blocklists">
          <div className="py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist-400">Blocked artists</p>
            <ChipListEditor items={settings.blockedArtists} onChange={(v) => patch({ blockedArtists: v })} placeholder="Artist name" />
          </div>
          <div className="py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist-400">Blocked genres</p>
            <ChipListEditor items={settings.blockedGenres} onChange={(v) => patch({ blockedGenres: v })} placeholder="Genre" />
          </div>
        </SectionCard>

        <SectionCard title="Danger zone">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-mist-100">Reset office statistics</p>
              <p className="text-xs text-mist-500">Clears history, ratings, and votes. Profiles are kept.</p>
            </div>
            <button onClick={resetStats} className="btn-secondary !border-signal-red/40 !text-signal-red !px-3 !py-2 text-xs">
              Reset
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
