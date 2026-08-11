'use client';

import { useLang, type Lang } from '@/hooks/useLang';

// ธงวาดเป็น SVG ไม่ใช้ emoji — Windows ไม่เรนเดอร์ flag emoji (ขึ้นเป็นตัวอักษร TH/GB แทน)
function FlagTH({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.67} viewBox="0 0 18 12" className="shrink-0 rounded-[2px]">
      <rect width="18" height="12" fill="#A51931" />
      <rect y="2" width="18" height="8" fill="#F4F5F8" />
      <rect y="4" width="18" height="4" fill="#2D2A4A" />
    </svg>
  );
}

function FlagEN({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.67} viewBox="0 0 60 40" className="shrink-0 rounded-[2px]">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  );
}

const OPTIONS: { code: Lang; label: string; Flag: typeof FlagTH }[] = [
  { code: 'th', label: 'ไทย', Flag: FlagTH },
  { code: 'en', label: 'EN', Flag: FlagEN },
];

/**
 * ปุ่มสลับภาษาแบบ pill พร้อมธง
 * - onDark: วางบนพื้น gradient เข้ม (แผงแบรนด์ / hero มือถือ)
 * - accent: สีตัวอักษรของตัวเลือกที่เลือกอยู่ (น้ำเงินฝั่งผู้เช่า / เขียวฝั่งเจ้าของหอ)
 */
export function LangToggle({
  onDark = false,
  accent = '#1E4FB0',
  className = '',
}: {
  onDark?: boolean;
  accent?: string;
  className?: string;
}) {
  const { lang, setLang } = useLang();

  return (
    <div
      className={`flex items-center gap-1 rounded-full p-1 ${className}`}
      style={onDark ? { background: 'rgba(255,255,255,0.18)' } : { background: '#F1F4F8' }}
    >
      {OPTIONS.map(({ code, label, Flag }) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold transition"
            style={
              active
                ? { background: '#fff', color: accent, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                : { color: onDark ? 'rgba(255,255,255,0.85)' : '#7A808B' }
            }
          >
            <Flag />
            {label}
          </button>
        );
      })}
    </div>
  );
}
