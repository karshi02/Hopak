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

  return (
    <div className={`hidden items-center gap-0.5 rounded-full p-0.5 md:flex ${wrapClass}`}>
      <button
        type="button"
        onClick={() => onChange('th')}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
          lang === 'th'
            ? 'bg-white text-ink-strong'
            : dark
              ? 'text-[#C7CCD5]'
              : 'text-ink-subtitle dark:text-white/70'
        }`}
      >
        <ThaiFlagIcon className="h-3 w-[18px] rounded-[2px]" /> ไทย
      </button>
      <button
        type="button"
        onClick={() => onChange('en')}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
          lang === 'en'
            ? 'bg-white text-ink-strong'
            : dark
              ? 'text-[#C7CCD5]'
              : 'text-ink-subtitle dark:text-white/70'
        }`}
      >
        <UkFlagIcon className="h-3 w-[18px] rounded-[2px]" /> EN
      </button>
    </div>
  );
}
