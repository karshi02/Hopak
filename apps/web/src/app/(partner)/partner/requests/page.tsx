'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import type { Booking } from '@hopak/shared';

const TEXT = {
  th: {
    title: 'การจองเข้ามา',
    pendingCount: (n: number) => `รอผู้เช่าชำระเงิน ${n} รายการ · เมื่อชำระแล้วระบบแจ้งเตือนและออกใบจองอัตโนมัติ`,
    booker: 'ผู้จอง',
    phone: 'เบอร์โทร',
    checkIn: 'วันเข้าอยู่',
    amount: 'ยอด',
    waitingPay: 'รอชำระเงิน',
    none: 'ไม่มีการจองที่รอชำระ',
    footnote: 'เบอร์ผู้จองถูกซ่อนบางส่วน จะเปิดเผยเต็มหลังผู้เช่าชำระเงินเรียบร้อย',
    historyTitle: 'ประวัติการจอง',
    historySub: (n: number) => `${n} รายการที่ชำระ/ยกเลิกแล้ว`,
    status: 'สถานะ',
    noHistory: 'ยังไม่มีประวัติ',
    dailyTag: 'รายวัน',
    monthlyTag: 'รายเดือน',
    nightsWord: 'คืน',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Incoming Bookings',
    pendingCount: (n: number) => `${n} awaiting tenant payment · auto-notified and slip issued once paid`,
    booker: 'Booker',
    phone: 'Phone',
    checkIn: 'Check-in date',
    amount: 'Amount',
    waitingPay: 'Awaiting payment',
    none: 'No bookings awaiting payment',
    footnote: "The booker's phone is partly hidden until fully paid",
    historyTitle: 'Booking history',
    historySub: (n: number) => `${n} paid/cancelled`,
    status: 'Status',
    noHistory: 'No history yet',
    dailyTag: 'Daily',
    monthlyTag: 'Monthly',
    nightsWord: 'nights',
    dateLocale: 'en-US',
  },
};

// วันเข้าพัก: รายวันโชว์ช่วงวัน (เข้า–ออก + จำนวนคืน), รายเดือนโชว์วันเข้าอยู่
function rentalCell(b: Booking, t: (typeof TEXT)['th']) {
  if (b.rentalType === 'DAILY' && b.checkOutDate) {
    const opt = { day: 'numeric', month: 'short' } as const;
    const inD = new Date(b.checkInDate).toLocaleDateString(t.dateLocale, opt);
    const outD = new Date(b.checkOutDate).toLocaleDateString(t.dateLocale, opt);
    return `${inD} – ${outD} · ${b.nights ?? 0} ${t.nightsWord}`;
  }
  return new Date(b.checkInDate).toLocaleDateString(t.dateLocale);
}

function RentalTag({ b, t }: { b: Booking; t: (typeof TEXT)['th'] }) {
  const daily = b.rentalType === 'DAILY';
  return (
    <span
      className={`ml-2 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
        daily ? 'bg-success-tint text-success' : 'bg-tenant-tint text-tenant'
      }`}
    >
      {daily ? t.dailyTag : t.monthlyTag}
    </span>
  );
}

export default function PartnerRequestsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [bookings, setBookings] = useState<Booking[]>([]);

  function reload() {
    apiClient.get<Booking[]>('/bookings').then(setBookings).catch(() => setBookings([]));
  }

  useEffect(() => {
    reload();

    const socket = getSocket();
    socket.on('booking:new', (booking: Booking) => {
      setBookings((prev) => [booking, ...prev]);
    });
    socket.on('booking:updated', (updated: Booking) => {
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    });
    return () => {
      socket.off('booking:new');
      socket.off('booking:updated');
    };
  }, []);

  const pending = bookings.filter((b) => normalizeStatus(b.status) === 'pending');
  // ประวัติ = คำขอที่ไม่ใช่ pending แล้ว (ยืนยัน/ปฏิเสธ/จ่าย/เข้าพัก/ยกเลิก) เรียงใหม่สุดก่อน
  const history = bookings
    .filter((b) => normalizeStatus(b.status) !== 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div>
      <p className="text-sm text-ink-faint">{t.pendingCount(pending.length)}</p>

      <div className="mt-4 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs text-ink-faint">
              <th className="p-3 font-normal">{t.booker}</th>
              <th className="p-3 font-normal">{t.phone}</th>
              <th className="p-3 font-normal">{t.checkIn}</th>
              <th className="p-3 font-normal">{t.amount}</th>
              <th className="p-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((b) => (
              <tr key={b.id} className="border-b border-hairline last:border-0">
                <td className="p-3 font-medium text-ink-strong">
                  {b.contactName}
                  <RentalTag b={b} t={t} />
                </td>
                <td className="p-3 font-sans tabular-nums text-ink-subtitle">{b.contactPhone.slice(0, 8)}**-*</td>
                <td className="p-3 text-ink-subtitle">{rentalCell(b, t)}</td>
                <td className="p-3 font-sans font-semibold tabular-nums">฿{(b.amount ?? 0).toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#FFF3E0] px-3 py-1.5 text-xs font-semibold text-[#C77B14]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#E0902F]" />
                      {t.waitingPay}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pending.length === 0 && <p className="p-4 text-ink-faint">{t.none}</p>}
      </div>

      <p className="mt-3 text-xs text-ink-faint">{t.footnote}</p>

      {/* ประวัติการยืนยัน/ปฏิเสธ */}
      <div className="mt-8">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-base font-bold text-ink-strong">{t.historyTitle}</h2>
          <span className="text-sm text-ink-muted">{t.historySub(history.length)}</span>
        </div>

        {/* จอใหญ่: ตาราง */}
        <div className="mt-3 hidden overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-faint">
                <th className="p-3 font-normal">{t.booker}</th>
                <th className="p-3 font-normal">{t.checkIn}</th>
                <th className="p-3 font-normal">{t.amount}</th>
                <th className="p-3 font-normal">{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => {
                const badge = bookingStatusBadge(normalizeStatus(b.status), lang);
                return (
                  <tr key={b.id} className="border-b border-hairline last:border-0">
                    <td className="p-3 font-medium text-ink-strong">
                      {b.contactName}
                      <RentalTag b={b} t={t} />
                    </td>
                    <td className="p-3 text-ink-subtitle">{rentalCell(b, t)}</td>
                    <td className="p-3 font-sans font-semibold tabular-nums">฿{(b.amount ?? 0).toLocaleString()}</td>
                    <td className="p-3">
                      <Badge label={badge.label} variant={badge.variant} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {history.length === 0 && <p className="p-4 text-ink-faint">{t.noHistory}</p>}
        </div>

        {/* มือถือ: การ์ด */}
        <div className="mt-3 flex flex-col gap-2.5 sm:hidden">
          {history.map((b) => {
            const badge = bookingStatusBadge(normalizeStatus(b.status), lang);
            return (
              <div key={b.id} className="rounded-card-lg border border-card-border bg-white p-3.5 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink-strong">
                    {b.contactName}
                    <RentalTag b={b} t={t} />
                  </span>
                  <Badge label={badge.label} variant={badge.variant} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-ink-muted">{rentalCell(b, t)}</span>
                  <span className="font-sans font-bold tabular-nums text-ink-strong">฿{(b.amount ?? 0).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
          {history.length === 0 && <p className="text-ink-faint">{t.noHistory}</p>}
        </div>
      </div>
    </div>
  );
}
