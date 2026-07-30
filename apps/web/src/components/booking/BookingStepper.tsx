'use client';

import type { Lang } from '@/hooks/useLang';

const STEP_LABELS: Record<Lang, string[]> = {
  th: ['ส่งข้อมูล', 'รอหอพักยืนยัน', 'หอพักยืนยัน', 'โอนเงิน + สลิป', 'รับใบเสร็จ'],
  en: ['Send info', 'Awaiting owner', 'Owner confirmed', 'Transfer + slip', 'Get receipt'],
};

const STEP_PREFIX: Record<Lang, string> = { th: 'ขั้นที่', en: 'Step' };

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5 9-11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// stepper แนวนอน 5 ขั้นตามดีไซน์ — current = 1..5 (ขั้นปัจจุบัน)
export function BookingStepper({ current, lang }: { current: number; lang: Lang }) {
  const labels = STEP_LABELS[lang];
  return (
    <div className="mt-5 flex items-center overflow-x-auto rounded-2xl border border-[#EAEDF2] bg-white px-4 py-4 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:px-6">
      {labels.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        const circleBg = done ? '#1FB56E' : active ? '#2F6FE0' : '#fff';
        const circleBc = done ? '#1FB56E' : active ? '#2F6FE0' : '#E4E7EC';
        const numFg = done || active ? '#fff' : '#9AA0AB';
        const labelFg = done || active ? '#161A22' : '#9AA0AB';
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex shrink-0 items-center gap-2.5">
              <div
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: circleBg, border: `2px solid ${circleBc}`, color: numFg }}
              >
                {done ? <CheckIcon /> : idx}
              </div>
              <div className="hidden sm:block">
                <div className="text-[10.5px] font-semibold text-[#9AA0AB]">
                  {STEP_PREFIX[lang]} {idx}
                </div>
                <div className="whitespace-nowrap text-[13px] font-bold" style={{ color: labelFg }}>
                  {label}
                </div>
              </div>
            </div>
            {idx < 5 && (
              <div
                className="mx-3 h-0.5 min-w-[14px] flex-1 rounded"
                style={{ background: done ? '#1FB56E' : '#E4E7EC' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
