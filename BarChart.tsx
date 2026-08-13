export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs text-mist-400">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-aux-gradient" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-xs text-mist-300">{d.value}%</span>
        </div>
      ))}
    </div>
  );
}
