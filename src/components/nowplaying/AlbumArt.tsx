'use client';

import Image from 'next/image';

// Demo Mode tracks have no real Spotify album art. Rather than show a
// broken image or a boring placeholder box, we derive a deterministic
// gradient tile from the track name so every song still feels distinct.
function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hueA = hash % 360;
  const hueB = (hueA + 70 + (hash % 40)) % 360;
  return `linear-gradient(135deg, hsl(${hueA} 70% 55%), hsl(${hueB} 70% 45%))`;
}

export function AlbumArt({
  url,
  title,
  size = 'lg',
}: {
  url: string | null;
  title: string;
  size?: 'lg' | 'md' | 'sm';
}) {
  const dims = { lg: 'h-full w-full', md: 'h-16 w-16', sm: 'h-11 w-11' }[size];
  if (url) {
    return (
      <div className={`relative overflow-hidden rounded-xl2 ${dims}`}>
        <Image src={url} alt={title} fill sizes="320px" className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-xl2 text-2xl ${dims}`}
      style={{ background: gradientFor(title) }}
    >
      🎵
    </div>
  );
}
