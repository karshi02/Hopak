'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import type { Booking } from '@hopak/shared';

const TEXT = {
  th: {
    title: 'ใบจอง',
    countLabel: (n: number) => `${n} ใบจอง`,
    printTooltip: 'ยังไม่เชื่อมระบบออก PDF',
    print: 'ปริ้นใบจอง PDF',
    id: 'เลขที่',
    booker: 'ผู้จอง',
    checkIn: 'วันเข้าอยู่',
    amount: 'ยอด',
    status: 'สถานะ',
    download: 'ดาวน์โหลด PDF',
    none: 'ไม่มีใบจอง',
    footnote: 'ใบจองมีรายละเอียดห้อง ราคา และใบยืนยันการชำระเงิน',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Slips',
    countLabel: (n: number) => `${n} slips`,
    printTooltip: 'PDF export not connected yet',
    print: 'Print slip PDF',
    id: 'ID',
    booker: 'Booker',
    checkIn: 'Check-in date',
    amount: 'Amount',
    status: 'Status',
    download: 'Download PDF',
    none: 'No slips',
    footnote: 'Slips include room details, price, and payment confirmation',
    dateLocale: 'en-US',
  },
};

export default function PartnerSlipsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    apiClient.get<Booking[]>('/bookings').then((data) =>
      setBookings(data.filter((b) => ['paid', 'completed'].includes(normalizeStatus(b.status)))),
    );
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
          <p className="mt-0.5 text-sm text-ink-faint">{t.countLabel(bookings.length)}</p>
        </div>
        <button
          disabled
          title={t.printTooltip}
          className="ml-auto flex items-center gap-2 rounded-btn bg-[#111827] px-4 py-2 text-sm font-semibold text-white opacity-50"
        >
          {t.print}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">{t.id}</th>
              <th className="p-3 font-normal">{t.booker}</th>
              <th className="p-3 font-normal">{t.checkIn}</th>
              <th className="p-3 font-normal">{t.amount}</th>
              <th className="p-3 font-normal">{t.status}</th>
              <th className="p-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const badge = bookingStatusBadge(normalizeStatus(b.status), lang);
              return (
                <tr key={b.id} className="border-t border-card-border dark:border-white/10">
                  <td className="p-3 font-sans text-ink-subtitle">#{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3 font-medium text-ink-strong dark:text-white">{b.contactName}</td>
                  <td className="p-3 text-ink-subtitle">{new Date(b.checkInDate).toLocaleDateString(t.dateLocale)}</td>
                  <td className="p-3 font-sans font-semibold tabular-nums">฿{b.amount.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge label={badge.label} variant={badge.variant} />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      disabled
                      title={t.printTooltip}
                      className="rounded-btn border border-card-border px-3 py-1.5 text-xs font-semibold opacity-50 dark:border-white/10"
                    >
                      {t.download}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {bookings.length === 0 && <p className="p-4 text-ink-faint">{t.none}</p>}
      </div>
      <p className="mt-3 text-xs text-ink-faint">{t.footnote}</p>
    </div>
  );
}
