'use client';

import type { ReactNode } from 'react';
import type { Booking } from '@hopak/shared';
import type { Lang } from '@/hooks/useLang';

const TEXT: Record<Lang, Record<string, string>> = {
  th: {
    roomAir: 'ห้องแอร์',
    roomFan: 'ห้องพัดลม',
    noReview: 'ยังไม่มีรีวิว',
    summary: 'สรุปค่าใช้จ่าย',
    firstMonth: 'ค่าเช่าเดือนแรก',
    deposit: 'ค่ามัดจำ',
    fee: 'ค่าจองผ่าน Hoprak',
    free: 'ฟรี',
    payTotal: 'ยอดชำระวันเข้าอยู่',
    payNote: 'ค่าเช่าเดือนแรก + ค่ามัดจำ',
    secure: 'ข้อมูลของคุณถูกเข้ารหัสและปลอดภัย',
    r1: 'จองสำเร็จ · สแกน QR พร้อมเพย์เพื่อชำระเงิน',
    r2: 'ระบบตรวจยอดอัตโนมัติ ไม่ต้องรอเจ้าของหอ/แอดมินยืนยัน',
    r3: 'ชำระแล้วออกใบเสร็จ + โทเค็นทันที นำโค้ดไปยืนยันกับหอพักตอนเข้าพัก',
  },
  en: {
    roomAir: 'Air-con room',
    roomFan: 'Fan room',
    noReview: 'No reviews yet',
    summary: 'Cost summary',
    firstMonth: 'First month rent',
    deposit: 'Deposit',
    fee: 'Hoprak booking fee',
    free: 'Free',
    payTotal: 'Due on move-in',
    payNote: 'First month rent + deposit',
    secure: 'Your information is encrypted and secure',
    r1: 'Booked · scan the PromptPay QR to pay',
    r2: 'The system verifies automatically — no waiting for owner/admin',
    r3: 'Once paid, the receipt & check-in code are issued instantly to show the dorm',
  },
};

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <span className="text-[13.5px] text-[#5B616C]">{label}</span>
      <span className={`text-sm font-semibold ${valueClass ?? 'text-ink-strong'}`}>{value}</span>
    </div>
  );
}

// sidebar สรุปการจองตามดีไซน์ — children = ปุ่ม CTA เฉพาะของแต่ละขั้นตอน (inject จากหน้า)
export function BookingSummary({
  booking,
  lang,
  children,
  showReassure = true,
}: {
  booking: Booking;
  lang: Lang;
  children?: ReactNode;
  showReassure?: boolean;
}) {
  const t = TEXT[lang];
  const room = booking.room;
  const roomLabel = room?.name || (room?.type?.toUpperCase() === 'AIR' ? t.roomAir : t.roomFan);
  const cover = room?.images?.[0] ?? room?.dorm?.images?.[0] ?? null;
  const rating = room?.dorm?.avgRating;
  const reviewCount = room?.dorm?.reviewCount ?? 0;

  return (
    <div className="lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-[20px] border border-[#EAEDF2] bg-white shadow-[0_8px_26px_rgba(16,24,40,0.1)]">
        <div className="flex gap-3.5 p-[18px]">
          <div className="h-[74px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#3E5C8A] to-[#1E4FB0]">
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              {rating ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#E0902F">
                    <path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7L12 2z" />
                  </svg>
                  <span className="text-[12.5px] font-bold text-ink-strong">{rating.toFixed(1)}</span>
                  <span className="text-[11.5px] text-[#9AA0AB]">({reviewCount})</span>
                </>
              ) : (
                <span className="text-[11.5px] text-[#9AA0AB]">{t.noReview}</span>
              )}
            </div>
            <div className="truncate text-[15px] font-bold tracking-tight text-ink-strong">{room?.dorm?.name ?? '—'}</div>
            <div className="mt-0.5 truncate text-xs text-[#8A909F]">{roomLabel}</div>
          </div>
        </div>

        <div className="px-[18px] pb-[18px]">
          <div className="mb-3.5 h-px bg-[#F0F2F6]" />
          <div className="mb-3 text-sm font-bold text-ink-strong">{t.summary}</div>
          <Row label={t.firstMonth} value={`฿${booking.roomPrice.toLocaleString()}`} />
          {booking.deposit > 0 && <Row label={t.deposit} value={`฿${booking.deposit.toLocaleString()}`} />}
          <Row label={t.fee} value={t.free} valueClass="text-[#12A150]" />
          <div className="my-3.5 h-px bg-[#F0F2F6]" />
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-bold text-ink-strong">{t.payTotal}</span>
            <span className="text-2xl font-bold tabular-nums text-tenant">฿{booking.amount.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-right text-[11.5px] text-[#9AA0AB]">{t.payNote}</p>
          {children}
        </div>
      </div>

      {showReassure && (
        <div className="mt-3.5 rounded-2xl border border-[#EAEDF2] bg-white px-[18px] py-4">
          {[t.r1, t.r2, t.r3].map((text, i) => (
            <div key={text} className={`flex items-center gap-3 ${i < 2 ? 'mb-3' : ''}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-tenant-tint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5 9-11" stroke="#2F6FE0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[12.5px] leading-snug text-[#5B616C]">{text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-center gap-2 text-xs text-[#9AA0AB]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="10" width="16" height="10" rx="2" stroke="#9AA0AB" strokeWidth="1.7" />
          <path d="M8 10V7a4 4 0 018 0v3" stroke="#9AA0AB" strokeWidth="1.7" />
        </svg>
        {t.secure}
      </div>
    </div>
  );
}
