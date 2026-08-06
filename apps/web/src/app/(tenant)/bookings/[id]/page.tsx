'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { getSocket } from '@/lib/ws';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import type { Booking } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { BookingSummary } from '@/components/booking/BookingSummary';

const TEXT = {
  th: {
    title: 'รายละเอียดการจอง',
    stepLabel: {
      pending: 'รอชำระเงิน',
      paid: 'ชำระเงินแล้ว',
      completed: 'เข้าพักแล้ว · เสร็จสิ้น',
    } as Record<string, string>,
    pay: 'ชำระเงิน',
    cancel: 'ยกเลิกการจอง',
    receiptTitle: 'ใบเสร็จรับเงิน',
    receiptDone: 'ชำระเงินสำเร็จ',
    receiptDesc: 'เงินเข้าระบบเรียบร้อย นี่คือใบเสร็จของคุณ นำโค้ดด้านล่างไปยืนยันกับเจ้าของหอตอนเข้าพักเพื่อรับกุญแจ',
    rowTenant: 'ผู้เช่า',
    rowDorm: 'หอพัก',
    rowCheckIn: 'วันเข้าอยู่',
    rowBookedAt: 'วันที่จอง',
    rowRent: 'ค่าเช่าเดือนแรก',
    rowDeposit: 'ค่ามัดจำ',
    totalPaid: 'ยอดชำระทั้งหมด',
    paidBadge: 'ชำระเงินสำเร็จ · ยืนยันโดยระบบ Hoprak',
    tokenTitle: 'โทเค็นยืนยันการเข้าพัก',
    copy: 'คัดลอก',
    copied: 'คัดลอกแล้ว',
    tokenHint: (d: string) => `แสดงโค้ดนี้ให้เจ้าของหอกรอกในระบบเพื่อยืนยันตัวตนและรับกุญแจ · ใช้ได้ถึง ${d}`,
    checkedInTitle: 'เข้าพักเรียบร้อยแล้ว',
    checkedInDesc: (d: string) => `เจ้าของหอยืนยันการเข้าพักของคุณเมื่อ ${d} · การจองนี้เสร็จสมบูรณ์`,
    subPending: 'สแกน QR พร้อมเพย์เพื่อชำระเงินและยืนยันการจอง',
    subPaid: 'รับใบเสร็จและนำไปยืนยันกับหอพัก',
    subCancelled: 'การจองสิ้นสุดแล้ว',
    payTitle: 'จองสำเร็จ · ชำระเงินเพื่อยืนยัน',
    payDesc: 'จองห้องเรียบร้อยแล้ว ขั้นตอนต่อไปคือสแกน QR พร้อมเพย์เพื่อชำระเงิน ระบบจะตรวจยอดอัตโนมัติและออกใบเสร็จให้ทันที',
    amountDue: 'ยอดที่ต้องชำระ',
    cancelledTitle: 'การจองถูกยกเลิก',
    cancelledDesc: 'การจองนี้สิ้นสุดแล้ว คุณสามารถเลือกจองหอพักอื่นได้',
    ctaViewBookings: 'ดูการจองของฉัน',
    payCta: 'ไปหน้าชำระเงิน',
    hintPay: 'สแกน QR พร้อมเพย์ · ระบบตรวจยอดอัตโนมัติ',
    hintReceipt: 'เก็บใบเสร็จไว้เป็นหลักฐาน',
    downloadReceipt: 'พิมพ์ / ดาวน์โหลดใบเสร็จ',
    roomAir: 'ห้องแอร์',
    roomFan: 'ห้องพัดลม',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Booking Details',
    stepLabel: {
      pending: 'Awaiting payment',
      paid: 'Paid',
      completed: 'Checked in · Completed',
    } as Record<string, string>,
    pay: 'Pay',
    cancel: 'Cancel booking',
    receiptTitle: 'Receipt',
    receiptDone: 'Payment successful',
    receiptDesc:
      'Your payment has cleared. This is your receipt — show the code below to the dorm owner when you check in to get the key.',
    rowTenant: 'Tenant',
    rowDorm: 'Dorm',
    rowCheckIn: 'Move-in date',
    rowBookedAt: 'Booked on',
    rowRent: 'First month rent',
    rowDeposit: 'Deposit',
    totalPaid: 'Total paid',
    paidBadge: 'Payment successful · verified by Hoprak system',
    tokenTitle: 'Check-in verification token',
    copy: 'Copy',
    copied: 'Copied',
    tokenHint: (d: string) =>
      `Show this code to the dorm owner to verify your identity and get the key · valid until ${d}`,
    checkedInTitle: 'Checked in',
    checkedInDesc: (d: string) => `The dorm owner confirmed your check-in on ${d} · this booking is complete.`,
    subPending: 'Scan the PromptPay QR to pay and confirm your booking',
    subPaid: 'Get your receipt and show it to the dorm',
    subCancelled: 'This booking has ended',
    payTitle: 'Booked · pay to confirm',
    payDesc: 'Your room is booked. Next, scan the PromptPay QR to pay — the system verifies automatically and issues your receipt instantly.',
    amountDue: 'Amount due',
    cancelledTitle: 'Booking cancelled',
    cancelledDesc: 'This booking has ended. You can book another dorm.',
    ctaViewBookings: 'View my bookings',
    payCta: 'Go to payment',
    hintPay: 'Scan the PromptPay QR · verified automatically',
    hintReceipt: 'Keep the receipt as proof',
    downloadReceipt: 'Print / download receipt',
    roomAir: 'Air-conditioned room',
    roomFan: 'Fan room',
    dateLocale: 'en-US',
  },
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [booking, setBooking] = useState<Booking | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking).catch(() => router.replace('/login'));
  }, [id, router]);

  useEffect(() => {
    if (!getToken()) return;
    const socket = getSocket();
    // socket ส่งมาแค่แถว booking ดิบๆ (ไม่มี room/dorm ติดมา) — ดึงตัวเต็มใหม่ กันข้อมูลในหน้าหาย
    const onUpdated = (updated: Booking) => {
      if (updated.id === id) apiClient.get<Booking>(`/bookings/${id}`).then(setBooking).catch(() => {});
    };
    socket.on('booking:updated', onUpdated);
    return () => {
      socket.off('booking:updated', onUpdated);
    };
  }, [id]);

  async function handleCancel() {
    await apiClient.patch(`/bookings/${id}/cancel`);
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking);
  }

  function copyToken() {
    if (!booking?.checkInToken) return;
    navigator.clipboard?.writeText(booking.checkInToken).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!booking) return <PageLoader />;

  const status = normalizeStatus(booking.status);
  const canCancel = new Date() <= new Date(booking.cancelDeadline) && status !== 'cancelled';
  const showReceipt = status === 'paid' || status === 'completed';
  // จองแล้วยังไม่จ่าย (PENDING) = พร้อมชำระเงินทันที ไม่มีด่านเจ้าของหอ/แอดมินคั่น → ขั้นที่ 2
  const canPay = status === 'pending' && !booking.payment;
  const stepNum = canPay ? 2 : showReceipt ? 4 : 2;
  const sub = canPay ? t.subPending : showReceipt ? t.subPaid : t.subCancelled;

  const fmtDate = (v: string | Date) =>
    new Date(v).toLocaleDateString(t.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDateTime = (v: string | Date) =>
    new Date(v).toLocaleString(t.dateLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const room = booking.room;
  const roomLabel = room?.name || (room?.type?.toUpperCase() === 'AIR' ? t.roomAir : t.roomFan);
  const dormLine = [room?.dorm?.name, roomLabel].filter(Boolean).join(' · ') || '—';

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#F2F4F8]">
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/bookings')}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[#E4E7EC] bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="#3A4050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <div className="text-[22px] font-bold tracking-tight text-ink-strong sm:text-[25px]">{t.title}</div>
            <div className="mt-0.5 text-[13.5px] text-[#8A909F]">{sub}</div>
          </div>
        </div>

        <BookingStepper current={stepNum} lang={lang} />

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_400px]">
          <div className="min-h-[440px] rounded-[20px] border border-[#EAEDF2] bg-white p-6 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[30px]">

      {/* STEP 2 · READY TO PAY (จองแล้ว พร้อมชำระเงินทันที) */}
      {canPay && (
        <div className="flex flex-col items-center px-2 py-8 text-center sm:px-5">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#E7F7EF]">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#1FB56E" />
              <path d="M7.5 12.5l3 3 6-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="mt-5 text-xl font-bold text-ink-strong">{t.payTitle}</div>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#8A909F]">{t.payDesc}</p>
          <div className="mt-5 w-full max-w-md overflow-hidden rounded-[14px] border border-[#EAEDF2] text-left">
            {[
              { label: t.rowDorm, value: dormLine },
              { label: t.rowCheckIn, value: fmtDate(booking.checkInDate) },
              { label: t.amountDue, value: `฿${booking.amount.toLocaleString()}`, strong: true },
            ].map((r, i) => (
              <div
                key={r.label}
                className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-[#F0F2F6]' : 'bg-[#FBFCFE]'}`}
              >
                <span className="text-[13px] text-[#8A909F]">{r.label}</span>
                <span className={`text-[13.5px] font-bold ${r.strong ? 'text-tenant' : 'text-ink-strong'}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4 · RECEIPT */}
      {showReceipt && (
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-pill bg-success-tint">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#1FB56E" />
              <path d="M7.5 12.5l3 3 6-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="mt-4 text-xl font-bold text-ink-strong">
            {status === 'completed' ? t.checkedInTitle : t.receiptDone}
          </div>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            {status === 'completed' && booking.checkedInAt
              ? t.checkedInDesc(fmtDateTime(booking.checkedInAt))
              : t.receiptDesc}
          </p>

          {/* ===== RECEIPT ===== */}
          <div className="mt-6 w-full max-w-[430px] overflow-hidden rounded-card-lg border border-card-border bg-white text-left shadow-card-hover">
            <div className="flex items-center justify-between bg-gradient-to-br from-tenant-dark to-tenant px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 font-sans font-extrabold text-white">
                  H
                </span>
                <span className="text-[15px] font-bold text-white">{t.receiptTitle}</span>
              </div>
              <span className="font-sans text-xs text-[#CFE0FF]">#{booking.id.slice(-8).toUpperCase()}</span>
            </div>

            <div className="px-5 py-4">
              {[
                { label: t.rowTenant, value: booking.contactName },
                { label: t.rowDorm, value: dormLine },
                { label: t.rowCheckIn, value: fmtDate(booking.checkInDate) },
                { label: t.rowBookedAt, value: fmtDate(booking.createdAt) },
                ...(booking.deposit > 0
                  ? [
                      { label: t.rowRent, value: `฿${booking.roomPrice.toLocaleString()}` },
                      { label: t.rowDeposit, value: `฿${booking.deposit.toLocaleString()}` },
                    ]
                  : []),
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3 py-2">
                  <span className="shrink-0 text-[13px] text-ink-muted">{r.label}</span>
                  <span className="text-right text-[13.5px] font-semibold text-ink-strong">{r.value}</span>
                </div>
              ))}
              <div className="my-2.5 h-px bg-hairline" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink-strong">{t.totalPaid}</span>
                <span className="font-sans text-xl font-bold tabular-nums text-success">
                  ฿{booking.amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* ===== CHECK-IN TOKEN ===== */}
            {booking.checkInToken && status !== 'completed' && (
              <div className="mx-5 mb-[18px] rounded-[14px] border-[1.5px] border-dashed border-[#B9CEF5] bg-gradient-to-br from-[#F3F7FE] to-tenant-tint p-4">
                <div className="mb-2.5 flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z"
                      stroke="#2F6FE0"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <path d="M9 12l2 2 4-4" stroke="#2F6FE0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[12.5px] font-bold text-tenant-dark">{t.tokenTitle}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] border border-[#D5E4FF] bg-white px-3.5 py-2.5">
                  <span className="font-sans text-lg font-bold tracking-[3px] text-ink-strong">
                    {booking.checkInToken}
                  </span>
                  <button
                    type="button"
                    onClick={copyToken}
                    className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-tenant"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="9" width="11" height="11" rx="2" stroke="#2F6FE0" strokeWidth="1.7" />
                      <path d="M5 15V5a2 2 0 012-2h8" stroke="#2F6FE0" strokeWidth="1.7" />
                    </svg>
                    {copied ? t.copied : t.copy}
                  </button>
                </div>

                {booking.checkInTokenExpiresAt && (
                  <p className="mt-2.5 text-[11.5px] leading-relaxed text-[#5B7BB5]">
                    {t.tokenHint(fmtDate(booking.checkInTokenExpiresAt))}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-dashed border-[#CBEEDD] bg-success-tint px-5 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#12A150" strokeWidth="1.8" />
                <path d="M8 12l3 3 5-6" stroke="#12A150" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[12.5px] font-bold text-[#12704A]">{t.paidBadge}</span>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLED */}
      {status === 'cancelled' && (
        <div className="flex flex-col items-center px-2 py-10 text-center sm:px-5">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-danger-tint">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="1.8" />
              <path d="M9 9l6 6M15 9l-6 6" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="mt-5 text-xl font-bold text-ink-strong">{t.cancelledTitle}</div>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#8A909F]">{t.cancelledDesc}</p>
        </div>
      )}

          </div>

          {/* RIGHT · summary */}
          <BookingSummary booking={booking} lang={lang}>
            {canPay && (
              <>
                <button
                  onClick={() => router.push(`/bookings/${id}/pay`)}
                  className="mt-[18px] flex h-[52px] w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-tenant to-[#5B9DFF] text-base font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.3)] hover:brightness-105"
                >
                  {t.payCta}
                </button>
                <p className="mt-2 text-center text-[11.5px] text-[#9AA0AB]">{t.hintPay}</p>
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    className="mt-3 flex h-[46px] w-full items-center justify-center rounded-[13px] border border-danger text-sm font-semibold text-danger hover:bg-danger-tint"
                  >
                    {t.cancel}
                  </button>
                )}
              </>
            )}
            {showReceipt && (
              <>
                <button
                  onClick={() => router.push(`/bookings/${id}/receipt`)}
                  className="mt-[18px] flex h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-br from-tenant to-[#5B9DFF] text-base font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.3)] hover:brightness-105"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t.downloadReceipt}
                </button>
                <button
                  onClick={() => router.push('/bookings')}
                  className="mt-3 flex h-[46px] w-full items-center justify-center rounded-[13px] border border-[#178F5A] text-sm font-semibold text-[#12704A] hover:bg-[#EAF9F1]"
                >
                  {t.ctaViewBookings}
                </button>
                <p className="mt-2 text-center text-[11.5px] text-[#9AA0AB]">{t.hintReceipt}</p>
              </>
            )}
            {status === 'cancelled' && (
              <button
                onClick={() => router.push('/bookings')}
                className="mt-[18px] flex h-[52px] w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-tenant to-[#5B9DFF] text-base font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.3)] hover:brightness-105"
              >
                {t.ctaViewBookings}
              </button>
            )}
          </BookingSummary>
        </div>
      </div>
    </main>
  );
}
