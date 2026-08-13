'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BottomNav, Sidebar } from './Nav';
import { SocialMomentFeed } from './SocialMomentFeed';

const NO_GATE_PATHS = ['/onboarding', '/admin', '/party'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [demoMode, setDemoMode] = useState<boolean | null>(null);

  const skipGate = NO_GATE_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    fetch('/api/mode')
      .then((r) => r.json())
      .then((d) => setDemoMode(d.demoMode))
      .catch(() => setDemoMode(null));
  }, []);

  useEffect(() => {
    if (skipGate) {
      setChecked(true);
      return;
    }
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (!d.profile) {
          router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`);
        } else {
          setChecked(true);
        }
      })
      .catch(() => setChecked(true));
  }, [pathname, skipGate, router]);

  const isFullBleed = pathname.startsWith('/party') || pathname.startsWith('/admin');

  if (isFullBleed) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <Sidebar />
      <div className="sm:pl-60">
        {demoMode && (
          <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-dial-violet/20 px-4 py-1.5 text-center font-mono text-[11px] uppercase tracking-wider text-dial-violetSoft backdrop-blur">
            ● Demo Mode — seeded data, no Spotify account connected yet
          </div>
        )}
        <main className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-6 sm:pb-10">
          {checked || skipGate ? children : <ShellSkeleton />}
        </main>
      </div>
      <BottomNav />
      <SocialMomentFeed />
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-64 rounded-xl2 bg-ink-850" />
      <div className="h-10 rounded-xl2 bg-ink-850" />
      <div className="h-40 rounded-xl2 bg-ink-850" />
    </div>
  );
}
