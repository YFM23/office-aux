'use client';

import { useState } from 'react';

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-mist-100">{label}</p>
        {description && <p className="text-xs text-mist-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-aux-gradient' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export function NumberRow({
  label,
  description,
  value,
  onChange,
  suffix,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-mist-100">{label}</p>
        {description && <p className="text-xs text-mist-500">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-right font-mono text-sm text-mist-100 focus:border-dial-violet focus:outline-none"
        />
        {suffix && <span className="text-xs text-mist-500">{suffix}</span>}
      </div>
    </div>
  );
}

export function ChipListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft('');
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="pill">
            {item}
            <button onClick={() => onChange(items.filter((i) => i !== item))} className="ml-1 text-mist-500 hover:text-signal-red">
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-mist-500">None blocked.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-400/60 focus:border-dial-violet focus:outline-none"
        />
        <button onClick={add} className="btn-secondary !px-3 !py-2 text-xs">
          Add
        </button>
      </div>
    </div>
  );
}

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="mb-1 font-display text-sm font-semibold text-mist-100">{title}</h3>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}
