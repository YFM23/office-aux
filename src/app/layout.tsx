import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/shared/AppShell';

// Font stack notes: Office Aux's type system pairs a tight geometric display
// face for headlines/wordmark with a warm, high-legibility body face and a
// monospace face for data (timestamps, percentages, scores) — a nod to
// analog radio dial readouts. We ship with a carefully tuned system-font
// stack so the app builds and looks intentional with zero network
// dependency; swap in next/font/google (Space Grotesk / Inter / JetBrains
// Mono) once you have one, following the commented block below.
//
//   import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';

export const metadata: Metadata = {
  title: 'OFFICE AUX',
  description: 'Your office. Your music.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06070c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className="min-h-screen bg-ink-950 text-mist-100 antialiased"
        style={
          {
            '--font-display': "'Avenir Next', 'Segoe UI Semibold', ui-sans-serif, system-ui, sans-serif",
            '--font-body': "'Inter', 'Segoe UI', ui-sans-serif, system-ui, sans-serif",
            '--font-mono': "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
          } as React.CSSProperties
        }
      >
        <div className="pointer-events-none fixed inset-0 bg-dial-glow" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
