'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { getSocket } from '@/lib/ws';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import type { Booking } from '@hopak/shared';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { HopakIcon } from '@/components/HopakIcon';
import { RouteSkeleton } from '@/components/RouteSkeleton';

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
    cancelTitle: 'ยกเลิกการจองนี้ไหม?',
    cancelBody: 'ห้องจะกลับไปเปิดให้คนอื่นจอง ถ้าเปลี่ยนใจทีหลังจองใหม่ได้ตามห้องที่ว่างอยู่ตอนนั้น',
    cancelFreeNote: 'ยังไม่ได้ชำระเงิน ยกเลิกตอนนี้ไม่มีค่าใช้จ่าย',
    cancelKeep: 'เก็บไว้ก่อน',
    cancelConfirm: 'ยกเลิกการจอง',
    cancelBusy: 'กำลังยกเลิก...',
    cancelFailed: 'ยกเลิกไม่สำเร็จ ลองใหม่อีกครั้ง',
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
    moreDetails: 'ดูรายละเอียดเพิ่มเติม',
    lessDetails: 'ย่อรายละเอียด',
    backToTop: 'กลับขึ้นด้านบน',
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
    cancelTitle: 'Cancel this booking?',
    cancelBody: 'The room goes back up for others to book. You can book again later from whatever is free at that time.',
    cancelFreeNote: 'Nothing has been charged, so cancelling now costs nothing.',
    cancelKeep: 'Keep it',
    cancelConfirm: 'Cancel booking',
    cancelBusy: 'Cancelling...',
    cancelFailed: 'Could not cancel. Please try again.',
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
    moreDetails: 'More details',
    lessDetails: 'Hide details',
    backToTop: 'Back to top',
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
  // ปุ่มลูกศรกลับขึ้นบน — โผล่หลังเลื่อนลงพ้นหนึ่งจอ ลอยตามตลอด
  const [showTop, setShowTop] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  // ปิดแล้วต้องคาไว้ให้จังหวะเลื่อนลงเล่นจบก่อนถอดออกจาก DOM
  const [cancelClosing, setCancelClosing] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 260);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // กดปุ่มยกเลิก = เปิดไดอะล็อกถามก่อน ไม่ยิงทันที (ยกเลิกแล้วกู้คืนไม่ได้)
  function handleCancel() {
    setCancelError(null);
    setCancelOpen(true);
  }

  function closeCancel() {
    if (cancelBusy) return; // กำลังยิง API อยู่ ห้ามปิดหนี
    setCancelClosing(true);
    setTimeout(() => {
      setCancelOpen(false);
      setCancelClosing(false);
    }, 500);
  }

  async function confirmCancel() {
    setCancelBusy(true);
    setCancelError(null);
    try {
      await apiClient.patch(`/bookings/${id}/cancel`);
      const fresh = await apiClient.get<Booking>(`/bookings/${id}`);
      setBooking(fresh);
      closeCancel();
    } catch {
      // apiClient โยน error เมื่อ response ไม่ ok — ต้อง catch เสมอ ไม่งั้นหน้าพังทั้งหน้า
      setCancelError(t.cancelFailed);
    } finally {
      setCancelBusy(false);
    }
  }

  function copyToken() {
    if (!booking?.checkInToken) return;
    navigator.clipboard?.writeText(booking.checkInToken).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!booking) return <RouteSkeleton variant="list" />;

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

        <div className={`mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_400px] ${canPay ? "pb-[104px] lg:pb-0" : ""}`}>
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
                <HopakIcon size={28} className="rounded-lg ring-1 ring-white/40" />
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

          {/* มือถือ: ปุ่มหลักอยู่ใต้การ์ดขั้นตอนเลย ไม่ต้องเลื่อนผ่านกล่องสรุปยาวๆ ก่อน
              จอ lg ขึ้นไปไม่ต้องมี เพราะกล่องสรุปกับปุ่มอยู่คอลัมน์ขวาเห็นพร้อมกันอยู่แล้ว */}
          {canPay && (
            <div className="lg:hidden">
              {/* ปุ่มจ่ายเงินอยู่ที่แถบติดขอบล่างตัวเดียว ไม่ต้องมีซ้ำในเนื้อหา
                  ปุ่มยกเลิกย้ายไปล่างสุดของหน้า — เป็นทางออก ไม่ใช่สิ่งที่อยากให้กดก่อน */}
              <p className="text-center text-[11.5px] text-[#9AA0AB]">{t.hintPay}</p>
            </div>
          )}

          {/* RIGHT · summary */}
          <BookingSummary booking={booking} lang={lang}>
            {/* มือถือ: ปุ่มยกเลิกอยู่ใต้ยอดชำระในกล่องสรุปเลย (ปุ่มจ่ายเงินอยู่ที่แถบติดขอบล่าง) */}
            {canPay && canCancel && (
              <button
                onClick={handleCancel}
                className="mt-4 flex h-[46px] w-full items-center justify-center rounded-[13px] border border-danger text-sm font-semibold text-danger active:bg-danger-tint lg:hidden"
              >
                {t.cancel}
              </button>
            )}
            {canPay && (
              // จอ lg ขึ้นไปใช้ชุดปุ่มเต็ม (จ่ายเงิน + ยกเลิก) เพราะไม่มีแถบติดขอบล่าง
              <div className="hidden lg:block">
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
              </div>
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

      {/* ยืนยันก่อนยกเลิก — บอกผลที่ตามมาจริงๆ (ห้องหลุดมือ กู้คืนไม่ได้) ไม่ใช่แค่ถามว่าแน่ใจไหม */}
      {cancelOpen && (
        <div
          onClick={closeCancel}
          className="hopak-backdrop fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(11,13,18,0.42)] p-4 sm:items-center"
          style={{
            animation: cancelClosing ? 'hopak-backdrop-out .5s ease-out forwards' : 'hopak-backdrop-in .5s ease-out',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            onClick={(e) => e.stopPropagation()}
            className="hopak-sheet w-full max-w-[460px] rounded-[22px] bg-white p-6 shadow-[0_24px_60px_rgba(8,12,24,0.35)] sm:p-7"
            style={{
              animation: cancelClosing
                ? 'hopak-sheet-down .5s cubic-bezier(.22,.61,.24,1) forwards'
                : 'hopak-sheet-up .5s cubic-bezier(.22,.61,.24,1)',
            }}
          >
            {/* ปฏิทินโทนกลาง — ของเดิมเป็นสามเหลี่ยมเตือนสีแดง ดูเหมือนกำลังจะเกิดเรื่องร้ายแรง
                ทั้งที่ยังไม่ได้จ่ายเงิน ยกเลิกตอนนี้ไม่เสียอะไร */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F4F9]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M8 3v3.5M16 3v3.5M4 10h16M5.5 5.5h13a1 1 0 011 1V19a1 1 0 01-1 1h-13a1 1 0 01-1-1V6.5a1 1 0 011-1z" stroke="#5B616C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 14l4 4M14 14l-4 4" stroke="#5B616C" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <h2 id="cancel-title" className="mt-4 text-[22px] font-bold leading-snug text-ink-strong">
              {t.cancelTitle}
            </h2>
            <p className="mt-2.5 text-[15.5px] leading-relaxed text-[#6B7280]">{t.cancelBody}</p>
            <p className="mt-3.5 rounded-[12px] bg-[#F4F7FB] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[#5B616C]">{t.cancelFreeNote}</p>
            {cancelError && <p className="mt-3 text-[13px] font-semibold text-danger">{cancelError}</p>}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                onClick={confirmCancel}
                disabled={cancelBusy}
                className="h-[62px] flex-1 rounded-[16px] border-2 border-danger bg-white text-[17px] font-bold text-danger disabled:opacity-60"
              >
                {cancelBusy ? t.cancelBusy : t.cancelConfirm}
              </button>
              <button
                onClick={closeCancel}
                disabled={cancelBusy}
                className="h-[62px] flex-1 rounded-[16px] bg-tenant text-[17.5px] font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.32)] disabled:opacity-50"
              >
                {t.cancelKeep}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ปุ่มลูกศรกลับขึ้นบน — ลอยตามจอ โผล่เมื่อเลื่อนลงมาแล้ว วางเหนือแถบจ่ายเงิน */}
      <button
        type="button"
        aria-label={t.backToTop}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-tenant shadow-[0_8px_22px_rgba(16,24,40,0.22)] ring-1 ring-black/[0.05] transition-all duration-300 lg:bottom-6 ${
          canPay ? 'bottom-[92px]' : 'bottom-6'
        } ${showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
          <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* แถบติดขอบล่าง (มือถือ) — ปุ่มจ่ายเงินตามไปด้วยตลอดหน้า ไม่ต้องเลื่อนกลับขึ้นไปหา */}
      {canPay && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EAEDF2] bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 shadow-[0_-6px_20px_rgba(16,24,40,0.1)] backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] text-[#8A909F]">{t.amountDue}</div>
              <div className="font-sans text-[19px] font-bold leading-tight text-tenant">
                ฿{booking.amount.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => router.push(`/bookings/${id}/pay`)}
              className="h-[48px] shrink-0 rounded-[13px] bg-gradient-to-br from-tenant to-[#5B9DFF] px-6 text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(47,111,224,0.32)] active:scale-[.99]"
            >
              {t.payCta}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
