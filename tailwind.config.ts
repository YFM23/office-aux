import type { Config } from 'tailwindcss';

// OFFICE AUX design tokens.
// Signature idea: a late-night radio dial glowing in an ink-navy room —
// not a Spotify-black clone. Accent is a violet -> coral "dial glow" gradient,
// with a signal-green used sparingly for "live" states (voting, now playing pulses).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#06070c',
          900: '#0b0e16',
          850: '#10131d',
          800: '#151a26',
          700: '#1e2433',
          600: '#2a3244',
          500: '#3c4459'
        },
        mist: {
          400: '#8a91a6',
          300: '#a6acbe',
          200: '#c7cbd8',
          100: '#eceef3'
        },
        dial: {
          violet: '#7c5cff',
          violetSoft: '#a996ff',
          coral: '#ff6b5c',
          coralSoft: '#ff9a8f',
          gold: '#ffb84d'
        },
        signal: {
          green: '#33d6a6',
          red: '#ff5470'
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)']
      },
      backgroundImage: {
        'dial-glow': 'radial-gradient(circle at 30% 20%, rgba(124,92,255,0.35), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255,107,92,0.25), transparent 45%)',
        'aux-gradient': 'linear-gradient(135deg, #7c5cff 0%, #ff6b5c 100%)'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,92,255,0.25), 0 8px 40px -8px rgba(124,92,255,0.45)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)'
      },
      borderRadius: {
        xl2: '1.25rem'
      },
      keyframes: {
        'spin-slow': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'pulse-ring': { '0%': { opacity: '0.6', transform: 'scale(0.9)' }, '100%': { opacity: '0', transform: 'scale(1.6)' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } }
      },
      animation: {
        'spin-slow': 'spin-slow 8s linear infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite',
        rise: 'rise 0.25s ease-out'
      }
    }
  },
  plugins: []
};

export default config;
