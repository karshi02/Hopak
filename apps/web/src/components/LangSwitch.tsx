import type { Lang } from '@/hooks/useLang';

export function ThaiFlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden>
      <rect width="30" height="20" fill="#A51931" />
      <rect y="3.33" width="30" height="13.34" fill="#F4F5F8" />
      <rect y="6.67" width="30" height="6.67" fill="#2D2A4A" />
    </svg>
  );
}

export function UkFlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden>
      <defs>
        <clipPath id="uk-flag-clip">
          <rect width="30" height="20" />
        </clipPath>
      </defs>
      <g clipPath="url(#uk-flag-clip)">
        <rect width="30" height="20" fill="#00247D" />
        <path d="M0 0L30 20M30 0L0 20" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M0 0L30 20M30 0L0 20" stroke="#CF142B" strokeWidth="1.6" />
        <path d="M15 0V20M0 10H30" stroke="#FFFFFF" strokeWidth="6.6" />
        <path d="M15 0V20M0 10H30" stroke="#CF142B" strokeWidth="4" />
      </g>
    </svg>
  );
}

export function LangSwitch({
  lang,
  onChange,
  dark = false,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  dark?: boolean;
}) {
  const wrapClass = dark
    ? 'bg-white/10'
    : 'border border-card-border bg-surface-canvas dark:border-white/10 dark:bg-white/5';

  // มือถือ: โชว์เฉพาะธง (ประหยัดที่) · จอ sm ขึ้นไป: ธง + ชื่อภาษา
  const pill = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold transition sm:px-2.5 ${
      active ? 'bg-white text-ink-strong shadow-sm' : dark ? 'text-[#C7CCD5]' : 'text-ink-subtitle dark:text-white/70'
    }`;

  return (
    <div className={`flex shrink-0 items-center gap-0.5 rounded-full p-0.5 ${wrapClass}`}>
      <button type="button" onClick={() => onChange('th')} aria-pressed={lang === 'th'} className={pill(lang === 'th')}>
        <ThaiFlagIcon className="h-3 w-[18px] rounded-[2px]" />
        <span className="hidden sm:inline">ไทย</span>
      </button>
      <button type="button" onClick={() => onChange('en')} aria-pressed={lang === 'en'} className={pill(lang === 'en')}>
        <UkFlagIcon className="h-3 w-[18px] rounded-[2px]" />
        <span className="hidden sm:inline">EN</span>
      </button>
    </div>
  );
}
