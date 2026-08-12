'use client';

import { useMemo, useState } from 'react';

interface BookedRange {
  from: string;
  to: string;
}

const DOW = {
  th: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

const MONTH = {
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const TEXT = {
  th: {
    hint: 'แตะวันเข้าพัก แล้วแตะวันคืนห้อง',
    checkIn: 'เข้าพัก',
    checkOut: 'คืนห้อง',
    booked: 'เต็มแล้ว',
    nights: (n: number) => `${n} คืน`,
    clear: 'ล้าง',
    prev: 'เดือนก่อน',
    next: 'เดือนถัดไป',
  },
  en: {
    hint: 'Tap check-in, then check-out',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    booked: 'Booked',
    nights: (n: number) => `${n} night${n > 1 ? 's' : ''}`,
    clear: 'Clear',
    prev: 'Previous month',
    next: 'Next month',
  },
};

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * ปฏิทินเลือกช่วงวันสำหรับเช่ารายวัน
 * - วันที่ถูกจองแล้วปิดกดไม่ได้ (เห็นทันทีว่าเต็มวันไหน ไม่ต้องลองเลือกแล้วโดนปฏิเสธ)
 * - เลือกวันเข้าพักก่อน แล้วเลือกวันคืนห้อง ; ถ้าช่วงที่เลือกคร่อมวันที่เต็ม จะไม่ให้เลือก
 * - checkOut คือ "วันออก" ไม่นับเป็นคืน (ตรงกับกติกาฝั่ง API)
 */
export function DailyCalendar({
  lang,
  checkIn,
  checkOut,
  bookedRanges,
  pricePerDay,
  onChange,
}: {
  lang: 'th' | 'en';
  checkIn: string;
  checkOut: string;
  bookedRanges: BookedRange[];
  pricePerDay: number;
  onChange: (checkIn: string, checkOut: string) => void;
}) {
  const t = TEXT[lang];
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [hoverISO, setHoverISO] = useState<string | null>(null);

  // วันที่ถูกจองแล้วทั้งหมด (คืนที่ถูกใช้ไป — วันคืนห้องของคนก่อนไม่นับ จองต่อได้)
  const bookedSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of bookedRanges) {
      const from = startOfDay(new Date(r.from));
      const to = startOfDay(new Date(r.to));
      for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) set.add(toISO(d));
    }
    return set;
  }, [bookedRanges]);

  const inISO = checkIn || null;
  const outISO = checkOut || null;
  // ปลายทางที่จะไฮไลต์ระหว่างลาก: ถ้ายังไม่เลือกวันออก ใช้วันที่เมาส์ชี้อยู่
  const rangeEnd = outISO ?? (inISO && hoverISO && hoverISO > inISO ? hoverISO : null);

  const nights =
    inISO && outISO
      ? Math.max(0, Math.round((new Date(outISO).getTime() - new Date(inISO).getTime()) / 86400000))
      : 0;

  // ช่วงที่เลือกต้องไม่คร่อมวันที่เต็ม
  const rangeHasBooked = (fromISO: string, toISOStr: string) => {
    for (let d = new Date(fromISO); toISO(d) < toISOStr; d.setDate(d.getDate() + 1)) {
      if (bookedSet.has(toISO(d))) return true;
    }
    return false;
  };

  function pick(iso: string) {
    if (!inISO || outISO || iso <= inISO) {
      onChange(iso, '');
      return;
    }
    if (rangeHasBooked(inISO, iso)) {
      // ข้ามวันเต็มไม่ได้ — เริ่มเลือกใหม่จากวันที่เพิ่งกด
      onChange(iso, '');
      return;
    }
    onChange(inISO, iso);
  }

  const monthsToShow = [cursor, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)];

  return (
    <div className="rounded-[14px] border border-card-border bg-white p-3.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t.prev}
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          disabled={cursor <= new Date(today.getFullYear(), today.getMonth(), 1)}
          className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-card-border text-ink-body disabled:opacity-35"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-[13px] font-semibold text-ink-body">{t.hint}</span>
        <button
          type="button"
          aria-label={t.next}
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-card-border text-ink-body"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-3 grid gap-5 sm:grid-cols-2">
        {monthsToShow.map((month) => {
          const first = new Date(month.getFullYear(), month.getMonth(), 1);
          const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
          const cells: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
          for (let d = 1; d <= days; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

          return (
            <div key={`${month.getFullYear()}-${month.getMonth()}`}>
              <div className="mb-1.5 text-center text-[13px] font-bold text-ink-strong">
                {MONTH[lang][month.getMonth()]} {month.getFullYear()}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DOW[lang].map((d, i) => (
                  <div key={`${d}-${i}`} className="pb-1 text-center text-[10.5px] font-semibold text-ink-faint">
                    {d}
                  </div>
                ))}
                {cells.map((date, i) => {
                  if (!date) return <div key={`pad-${i}`} />;
                  const iso = toISO(date);
                  const past = date < today;
                  const isBooked = bookedSet.has(iso);
                  const disabled = past || (isBooked && iso !== inISO);

                  const isIn = iso === inISO;
                  const isOut = iso === outISO;
                  const inRange = !!inISO && !!rangeEnd && iso > inISO && iso < rangeEnd;

                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(iso)}
                      onMouseEnter={() => setHoverISO(iso)}
                      onMouseLeave={() => setHoverISO(null)}
                      title={isBooked ? t.booked : undefined}
                      className={`relative flex aspect-square items-center justify-center rounded-[9px] text-[12.5px] font-semibold transition ${
                        isIn || isOut
                          ? 'bg-tenant text-white'
                          : inRange
                            ? 'bg-tenant-tint text-tenant'
                            : disabled
                              ? 'text-ink-faint'
                              : 'text-ink-body hover:bg-surface-canvas'
                      } ${disabled ? 'cursor-not-allowed' : ''}`}
                    >
                      {date.getDate()}
                      {isBooked && !past && (
                        <span className="absolute bottom-1 h-[3px] w-[3px] rounded-full bg-danger" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* สรุปช่วงที่เลือก */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3 text-[12.5px]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-tenant" />
          {t.checkIn}: <b className="font-sans text-ink-strong">{inISO ?? '—'}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-tenant-tint" />
          {t.checkOut}: <b className="font-sans text-ink-strong">{outISO ?? '—'}</b>
        </span>
        <span className="flex items-center gap-1.5 text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          {t.booked}
        </span>

        {nights > 0 && (
          <span className="ml-auto font-sans font-bold text-ink-strong">
            {t.nights(nights)} · ฿{(pricePerDay * nights).toLocaleString()}
          </span>
        )}
        {(inISO || outISO) && (
          <button type="button" onClick={() => onChange('', '')} className="text-[12px] font-semibold text-tenant underline">
            {t.clear}
          </button>
        )}
      </div>
    </div>
  );
}
