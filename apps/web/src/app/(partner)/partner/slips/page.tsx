'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import type { Booking } from '@hopak/shared';

export default function PartnerSlipsPage() {
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
          <h1 className="text-xl font-bold text-ink-strong dark:text-white">ใบจอง</h1>
          <p className="mt-0.5 text-sm text-ink-faint">{bookings.length} ใบจอง</p>
        </div>
        <button
          disabled
          title="ยังไม่เชื่อมระบบออก PDF"
          className="ml-auto flex items-center gap-2 rounded-btn bg-[#111827] px-4 py-2 text-sm font-semibold text-white opacity-50"
        >
          ปริ้นใบจอง PDF
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">เลขที่</th>
              <th className="p-3 font-normal">ผู้จอง</th>
              <th className="p-3 font-normal">วันเข้าอยู่</th>
              <th className="p-3 font-normal">ยอด</th>
              <th className="p-3 font-normal">สถานะ</th>
              <th className="p-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const badge = bookingStatusBadge(normalizeStatus(b.status));
              return (
                <tr key={b.id} className="border-t border-card-border dark:border-white/10">
                  <td className="p-3 font-sans text-ink-subtitle">#{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3 font-medium text-ink-strong dark:text-white">{b.contactName}</td>
                  <td className="p-3 text-ink-subtitle">{new Date(b.checkInDate).toLocaleDateString('th-TH')}</td>
                  <td className="p-3 font-sans font-semibold tabular-nums">฿{b.amount.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge label={badge.label} variant={badge.variant} />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      disabled
                      title="ยังไม่เชื่อมระบบออก PDF"
                      className="rounded-btn border border-card-border px-3 py-1.5 text-xs font-semibold opacity-50 dark:border-white/10"
                    >
                      ดาวน์โหลด PDF
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {bookings.length === 0 && <p className="p-4 text-ink-faint">ไม่มีใบจอง</p>}
      </div>
      <p className="mt-3 text-xs text-ink-faint">ใบจองมีรายละเอียดห้อง ราคา และใบยืนยันการชำระเงิน</p>
    </div>
  );
}
