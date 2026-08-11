'use client';

import { usePartnerMode, type PartnerMode } from '@/hooks/usePartnerMode';

const LABEL: Record<PartnerMode, Record<'th' | 'en', string>> = {
  monthly: { th: 'รายเดือน', en: 'Monthly' },
  daily: { th: 'รายวัน', en: 'Daily' },
};

// รายเดือน = น้ำเงิน, รายวัน = เขียว (ตามโทนทั้งระบบ)
const STYLE: Record<PartnerMode, { gradient: string; shadow: string }> = {
  monthly: {
    gradient: 'linear-gradient(135deg,#2F6FE0,#1E4FB0)',
    shadow: '0 4px 12px rgba(47,111,224,0.35)',
  },
  daily: {
    gradient: 'linear-gradient(135deg,#12A150,#0C7A3C)',
    shadow: '0 4px 12px rgba(18,161,80,0.35)',
  },
};

function ModeIcon({ mode, size = 15 }: { mode: PartnerMode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
      {mode === 'monthly' ? (
        // ปฏิทินเดือน
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
          <path d="M3.5 10h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </>
      ) : (
        // พระจันทร์ = ค้างคืน
        <path
          d="M20 14.2A8.2 8.2 0 019.8 4a8.4 8.4 0 100 16.4 8.2 8.2 0 0010.2-6.2z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * สวิตช์โหมดหอพัก — รายเดือน / รายวัน
 * ตัวที่เลือกเป็นแคปซูลไล่สีพร้อมเงา, ตัวที่ไม่ได้เลือกเป็นสีเทาจางกดได้
 */
export function PartnerModeSwitch({ lang, compact = false }: { lang: 'th' | 'en'; compact?: boolean }) {
  const { mode, setMode } = usePartnerMode();

  return (
    <div
      role="tablist"
      aria-label={lang === 'th' ? 'โหมดหอพัก' : 'Rental mode'}
      className={`inline-flex items-center gap-1 rounded-pill border border-card-border bg-surface-canvas shadow-[inset_0_1px_2px_rgba(16,24,40,0.05)] ${
        compact ? 'p-[3px]' : 'p-1'
      }`}
    >
      {(['monthly', 'daily'] as const).map((key) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 rounded-pill font-semibold transition-all duration-200 ${
              compact ? 'h-[30px] px-3 text-[12.5px]' : 'h-9 px-4 text-[13.5px]'
            } ${active ? 'text-white' : 'text-ink-muted hover:bg-white hover:text-ink-body'}`}
            style={active ? { background: STYLE[key].gradient, boxShadow: STYLE[key].shadow } : undefined}
          >
            <ModeIcon mode={key} size={compact ? 14 : 15} />
            {LABEL[key][lang]}
          </button>
        );
      })}
    </div>
  );
}
