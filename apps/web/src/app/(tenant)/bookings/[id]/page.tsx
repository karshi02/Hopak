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

const STEPS = ['pending', 'confirmed', 'paid', 'completed'] as const;

const TEXT = {
  th: {
    title: 'รายละเอียดการจอง',
    stepLabel: {
      pending: 'ส่งคำขอจอง',
      confirmed: 'เจ้าของหอยืนยัน',
      paid: 'ชำระเงินแล้ว',
      completed: 'เข้าพักแล้ว · เสร็จสิ้น',
    } as Record<string, string>,
    pay: 'ชำระเงิน',
    cancel: 'ยกเลิกการจอง',
    receiptTitle: 'ใบเสร็จรับเงิน',
    receiptDone: 'ยืนยันการชำระเงินสำเร็จ',
    receiptDesc: 'แอดมินตรวจสอบสลิปเรียบร้อยแล้ว นี่คือใบเสร็จของคุณ นำโค้ดด้านล่างไปยืนยันกับเจ้าของหอตอนเข้าพัก',
    rowTenant: 'ผู้เช่า',
    rowDorm: 'หอพัก',
    rowCheckIn: 'วันเข้าอยู่',
    rowBookedAt: 'วันที่จอง',
    totalPaid: 'ยอดชำระทั้งหมด',
    paidBadge: 'ชำระเงินสำเร็จ · ยืนยันโดยแอดมิน Hopak',
    tokenTitle: 'โทเค็นยืนยันการเข้าพัก',
    copy: 'คัดลอก',
    copied: 'คัดลอกแล้ว',
    tokenHint: (d: string) => `แสดงโค้ดนี้ให้เจ้าของหอกรอกในระบบเพื่อยืนยันตัวตนและรับกุญแจ · ใช้ได้ถึง ${d}`,
    checkedInTitle: 'เข้าพักเรียบร้อยแล้ว',
    checkedInDesc: (d: string) => `เจ้าของหอยืนยันการเข้าพักของคุณเมื่อ ${d} · การจองนี้เสร็จสมบูรณ์`,
    roomAir: 'ห้องแอร์',
    roomFan: 'ห้องพัดลม',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Booking Details',
    stepLabel: {
      pending: 'Request submitted',
      confirmed: 'Owner confirmed',
      paid: 'Paid',
      completed: 'Checked in · Completed',
    } as Record<string, string>,
    pay: 'Pay',
    cancel: 'Cancel booking',
    receiptTitle: 'Receipt',
    receiptDone: 'Payment confirmed',
    receiptDesc:
      'The admin has verified your slip. This is your receipt — show the code below to the dorm owner when you check in.',
    rowTenant: 'Tenant',
    rowDorm: 'Dorm',
    rowCheckIn: 'Move-in date',
    rowBookedAt: 'Booked on',
    totalPaid: 'Total paid',
    paidBadge: 'Payment successful · verified by Hopak admin',
    tokenTitle: 'Check-in verification token',
    copy: 'Copy',
    copied: 'Copied',
    tokenHint: (d: string) =>
      `Show this code to the dorm owner to verify your identity and get the key · valid until ${d}`,
    checkedInTitle: 'Checked in',
    checkedInDesc: (d: string) => `The dorm owner confirmed your check-in on ${d} · this booking is complete.`,
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
  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);
  const canCancel = new Date() <= new Date(booking.cancelDeadline) && status !== 'cancelled';
  const showReceipt = status === 'paid' || status === 'completed';

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
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>

      <ol className="mt-4 flex flex-col gap-2">
        {STEPS.map((step, i) => (
          <li key={step} className={i <= currentIndex ? 'font-medium text-success' : 'text-ink-faint'}>
            {t.stepLabel[step]}
          </li>
        ))}
      </ol>

      {showReceipt && (
        <div className="mt-6 flex flex-col items-center text-center">
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

      <div className="mt-6 flex flex-wrap gap-3">
        {status === 'confirmed' && (
          <button
            onClick={() => router.push(`/bookings/${id}/pay`)}
            className="rounded-btn bg-success px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            {t.pay}
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            className="rounded-btn border border-danger px-4 py-2 text-sm font-medium text-danger"
          >
            {t.cancel}
          </button>
        )}
      </div>
    </main>
  );
}
