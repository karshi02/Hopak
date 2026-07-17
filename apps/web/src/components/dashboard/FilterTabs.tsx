type Tone = 'total' | 'good' | 'warning' | 'critical' | 'neutral';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  tone?: Tone;
}

interface FilterTabsProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

const TONE_CLASS: Record<Tone, string> = {
  total: 'bg-tenant text-white',
  good: 'bg-[#E9F7EF] text-[#12813F]',
  warning: 'bg-[#FEF6E7] text-[#B4791A]',
  critical: 'bg-[#FDECEC] text-[#C0392B]',
  neutral: 'bg-[#F1F3F6] text-ink-subtitle',
};

export function FilterTabs({ options, value, onChange }: FilterTabsProps) {
  const hasTone = options.some((opt) => opt.tone);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const toneClass = opt.tone ? TONE_CLASS[opt.tone] : undefined;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-opacity ${
              toneClass ?? (active ? 'bg-[#0b0b0b] text-white dark:bg-white dark:text-[#0b0b0b]' : 'bg-black/5 text-ink-subtitle hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15')
            } ${hasTone && !active ? 'opacity-60' : ''}`}
          >
            {opt.label}
            {opt.count !== undefined && ` ${opt.count.toLocaleString()}`}
          </button>
        );
      })}
    </div>
  );
}
