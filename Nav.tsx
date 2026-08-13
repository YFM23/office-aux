'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './Wordmark';

const NAV_ITEMS = [
  { href: '/', emoji: '🎵', label: 'Playing' },
  { href: '/request', emoji: '🔎', label: 'Request' },
  { href: '/vibe', emoji: '🔥', label: 'Vibe' },
  { href: '/stats', emoji: '🏆', label: 'Stats' },
  { href: '/me', emoji: '👤', label: 'Me' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-ink-900/90 backdrop-blur-lg sm:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition ${
                active ? 'text-dial-violetSoft' : 'text-mist-400'
              }`}
            >
              <span className={`text-lg leading-none transition ${active ? 'scale-110' : ''}`}>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const extra = [
    { href: '/leaderboard', emoji: '🏆', label: 'Leaderboard' },
    { href: '/history', emoji: '🕰', label: 'History' },
    { href: '/party', emoji: '🪩', label: 'Party Mode' },
    { href: '/admin', emoji: '🛠', label: 'Admin' },
  ];
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/5 bg-ink-900/60 px-4 py-6 sm:flex">
      <div className="px-2 pb-8">
        <Wordmark size="md" />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {[...NAV_ITEMS, ...extra].map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-white/10 text-mist-100' : 'text-mist-400 hover:bg-white/5 hover:text-mist-200'
              }`}
            >
              <span className="text-base">{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
