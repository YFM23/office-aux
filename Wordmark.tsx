export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-sm tracking-[0.2em]',
    md: 'text-lg tracking-[0.22em]',
    lg: 'text-3xl tracking-[0.24em] sm:text-4xl',
  } as const;

  return (
    <div className={`font-display font-bold uppercase ${sizes[size]}`}>
      <span className="bg-aux-gradient bg-clip-text text-transparent">Office</span>{' '}
      <span className="text-mist-100">Aux</span>
    </div>
  );
}

export function Tagline({ className = '' }: { className?: string }) {
  return <p className={`font-mono text-xs uppercase tracking-[0.3em] text-mist-400 ${className}`}>Your office. Your music.</p>;
}
