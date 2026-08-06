'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import type { Booking } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { BookingSummary } from '@/components/booking/BookingSummary';

const IS_DEV = process.env.NODE_ENV !== 'production';

const TEXT = {
  th: {
    title: 'ชำระเงิน',
    sub: 'สแกน QR พร้อมเพย์เพื่อชำระเงิน · ระบบตรวจยอดอัตโนมัติ',
    qrBadge: 'พร้อมเพย์ · สแกน QR เพื่อชำระเงิน',
    amountLabel: 'ยอดที่ต้องชำระ',
    timeLeft: 'เหลือเวลาชำระเงิน',
    genQr: 'กำลังสร้าง QR...',
    waiting: 'รอสแกนและชำระเงิน · เมื่อเงินเข้าระบบจะข้ามไปขั้นถัดไปเอง',
    error: 'สร้าง QR ไม่สำเร็จ',
    retry: 'ลองใหม่',
    takenTitle: 'ห้องนี้มีคนกำลังจองอยู่',
    takenDesc: 'มีผู้เช่ารายอื่นกำลังชำระเงินห้องนี้อยู่ กรุณาเลือกห้องอื่น (ถ้าอีกฝ่ายไม่ชำระใน 10 นาที ห้องจะกลับมาว่าง)',
    backToRooms: 'กลับไปเลือกห้อง',
    devConfirm: 'จำลองจ่ายสำเร็จ (dev)',
    hint: 'สแกน QR พร้อมเพย์ · ระบบตรวจยอดอัตโนมัติ ไม่ต้องแนบสลิป',
  },
  en: {
    title: 'Payment',
    sub: 'Scan the PromptPay QR to pay · verified automatically',
    qrBadge: 'PromptPay · scan QR to pay',
    amountLabel: 'Amount due',
    timeLeft: 'Time left to pay',
    genQr: 'Generating QR...',
    waiting: 'Waiting for payment · moves on automatically once money is received',
    error: 'Could not create QR',
    retry: 'Try again',
    takenTitle: 'This room is being booked',
    takenDesc: 'Another tenant is paying for this room right now. Please pick another room (if they don’t pay within 10 minutes, it frees up again).',
    backToRooms: 'Back to rooms',
    devConfirm: 'Simulate paid (dev)',
    hint: 'Scan the PromptPay QR · verified automatically, no slip needed',
  },
};

export default function PayBookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [booking, setBooking] = useState<Booking | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null); // timestamp ms เส้นตายชำระเงิน
  const [left, setLeft] = useState<number | null>(null); // วินาทีที่เหลือ
  const [roomTaken, setRoomTaken] = useState(false); // ห้องถูกผู้เช่าอื่นกำลังจ่าย (409)
  const chargeStarted = useRef(false);

  // โหลด booking + กันเข้าหน้านี้ถ้าไม่ใช่สถานะรอชำระ
  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiClient
      .get<Booking>(`/bookings/${id}`)
      .then((b) => {
        if (b.status.toUpperCase() !== 'PENDING') {
          window.location.replace(`/bookings/${id}`);
          return;
        }
        setBooking(b);
      })
      .catch(() => window.location.replace(`/bookings/${id}`));
  }, [id, router]);

  // สร้าง QR ครั้งเดียวหลังได้ booking (ref กันซ้ำใน StrictMode)
  useEffect(() => {
    if (!booking || chargeStarted.current) return;
    chargeStarted.current = true;
    apiClient
      .post<{ qrString: string; paymentDeadline?: string }>(`/bookings/${id}/payment/charge`, {})
      .then((r) => {
        setQr(r.qrString);
        if (r.paymentDeadline) setDeadline(new Date(r.paymentDeadline).getTime());
      })
      .catch((e) => {
        // 409 = ห้องมีผู้เช่าอื่นกำลังจ่ายอยู่ → โชว์ state เฉพาะ + ปุ่มกลับไปเลือกห้อง
        if ((e as { status?: number })?.status === 409) setRoomTaken(true);
        setError(e instanceof Error ? e.message : t.error);
      });
  }, [booking, id, t.error]);

  // นับถอยหลัง 10 นาที — หมดเวลาเด้งกลับหน้า detail (cron ยกเลิก+คืนห้องแล้ว)
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const s = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) window.location.replace(`/bookings/${id}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline, id]);

  // poll สถานะ booking — เงินเข้า (PAID) เด้งใบเสร็จ ; ถูกยกเลิก (หมดเวลา) เด้งกลับ detail
  useEffect(() => {
    if (!booking) return;
    const timer = setInterval(() => {
      apiClient
        .get<Booking>(`/bookings/${id}`)
        .then((b) => {
          const s = normalizeStatus(b.status);
          if (s === 'paid' || s === 'completed') {
            clearInterval(timer);
            router.push(`/bookings/${id}/receipt`);
          } else if (s === 'cancelled') {
            clearInterval(timer);
            window.location.replace(`/bookings/${id}`);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [booking, id, router]);

  async function devConfirm() {
    try {
      await apiClient.post(`/bookings/${id}/payment/dev-confirm`, {});
      router.push(`/bookings/${id}/receipt`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    }
  }

  function retry() {
    setError(null);
    setQr(null);
    chargeStarted.current = false;
    setBooking((b) => (b ? { ...b } : b)); // trigger charge effect again
  }

  if (!booking) return <PageLoader />;

  // ห้องถูกผู้เช่าอื่นกำลังจ่ายอยู่ (409) — โชว์เต็มหน้า + ปุ่มกลับไปเลือกห้อง
  if (roomTaken) {
    const dormHref = booking.room?.dorm?.id ? `/dorms/${booking.room.dorm.id}` : '/search';
    return (
      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-[#F2F4F8] px-4">
        <div className="w-full max-w-[440px] rounded-[20px] border border-[#EAEDF2] bg-white p-8 text-center shadow-[0_2px_8px_rgba(16,24,40,0.05)]">
          <div className="mx-auto flex h-[80px] w-[80px] items-center justify-center rounded-full bg-[#FFF3E0]">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#C77B14" strokeWidth="1.8" />
              <path d="M12 8v4M12 16h.01" stroke="#C77B14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="mt-5 text-xl font-bold text-ink-strong">{t.takenTitle}</div>
          <p className="mt-2 text-sm leading-relaxed text-[#8A909F]">{t.takenDesc}</p>
          <button
            onClick={() => router.push(dormHref)}
            className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-tenant to-[#5B9DFF] text-base font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.3)] hover:brightness-105"
          >
            {t.backToRooms}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#F2F4F8]">
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/bookings/${id}`)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[#E4E7EC] bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="#3A4050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <div className="text-[22px] font-bold tracking-tight text-ink-strong sm:text-[25px]">{t.title}</div>
            <div className="mt-0.5 text-[13.5px] text-[#8A909F]">{t.sub}</div>
          </div>
        </div>

        <BookingStepper current={2} lang={lang} />

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_400px]">
          {/* LEFT · PromptPay QR */}
          <div className="rounded-[20px] border border-[#EAEDF2] bg-white p-6 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[30px]">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex h-[34px] items-center gap-2 rounded-pill bg-tenant-tint px-4 text-[13px] font-bold text-tenant-dark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="4" width="7" height="7" rx="1" stroke="#1E4FB0" strokeWidth="1.9" />
                  <rect x="4" y="14" width="7" height="6" rx="1" stroke="#1E4FB0" strokeWidth="1.9" />
                  <rect x="14" y="4" width="6" height="6" rx="1" stroke="#1E4FB0" strokeWidth="1.9" />
                  <path d="M14 14h3v3M20 14v6h-6" stroke="#1E4FB0" strokeWidth="1.9" />
                </svg>
                {t.qrBadge}
              </div>

              {/* Thai QR / PromptPay card */}
              <div className="mt-[18px] w-[268px] overflow-hidden rounded-[20px] border border-[#E4E7EC] bg-white shadow-[0_10px_28px_rgba(16,24,40,0.12)]">
                <div className="flex h-10 items-center justify-center gap-2 bg-[#003D6B]">
                  <span className="font-sans text-[15px] font-extrabold tracking-[0.5px] text-white">Thai QR</span>
                  <span className="font-sans text-[15px] font-extrabold text-[#EE3E80]">PromptPay</span>
                </div>
                <div className="flex h-[236px] items-center justify-center p-[18px]">
                  {error ? (
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-[12.5px] text-danger">{error}</span>
                      <button onClick={retry} className="rounded-btn bg-tenant px-4 py-2 text-[13px] font-bold text-white">
                        {t.retry}
                      </button>
                    </div>
                  ) : qr ? (
                    <QRCodeSVG value={qr} size={200} includeMargin />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-[#8A909F]">
                      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#E4E7EC] border-t-tenant" />
                      <span className="text-[12.5px]">{t.genQr}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-sm text-[#5B616C]">{t.amountLabel}</div>
              <div className="text-[30px] font-extrabold tracking-tight text-tenant">
                ฿{booking.amount.toLocaleString()}
              </div>

              {/* นับถอยหลัง 10 นาที — แดงเมื่อเหลือ < 1 นาที */}
              {left !== null && (
                <div
                  className={`mt-3 inline-flex items-center gap-2 rounded-pill px-4 py-1.5 text-sm font-bold tabular-nums ${
                    left < 60 ? 'bg-danger-tint text-danger' : 'bg-[#FFF3E0] text-[#C77B14]'
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  {t.timeLeft} {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
                </div>
              )}

              {/* waiting strip */}
              {qr && (
                <div className="mt-4 flex max-w-[400px] items-center gap-3 rounded-[13px] border border-[#F5E4C3] bg-[#FFF8EC] px-4 py-3">
                  <span className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                    <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#F5E4C3] border-t-[#E0902F]" />
                  </span>
                  <span className="text-left text-[12.5px] leading-relaxed text-[#8A6A2E]">{t.waiting}</span>
                </div>
              )}

              {IS_DEV && qr && (
                <button
                  onClick={devConfirm}
                  className="mt-3 rounded-btn border border-dashed border-[#C4D3EC] px-4 py-2 text-[12px] font-semibold text-[#8A909F] hover:bg-[#F7F9FC]"
                >
                  {t.devConfirm}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT · summary */}
          <BookingSummary booking={booking} lang={lang}>
            <div className="mt-[18px] flex h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-br from-[#B4BAC5] to-[#9AA0AB] text-base font-bold text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2" strokeOpacity="0.4" />
                <path d="M21 12a9 9 0 00-9-9" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {t.waiting.split(' · ')[0]}
            </div>
            <p className="mt-2 text-center text-[11.5px] text-[#9AA0AB]">{t.hint}</p>
          </BookingSummary>
        </div>
      </div>
    </main>
  );
}
