'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import type { Booking } from '@hopak/shared';

const TEXT = {
  th: {
    title: 'คำขอจอง',
    pendingCount: (n: number) => `รอยืนยัน ${n} รายการ · กดยืนยันเพื่อออกใบจองอัตโนมัติ`,
    booker: 'ผู้จอง',
    phone: 'เบอร์โทร',
    checkIn: 'วันเข้าอยู่',
    amount: 'ยอด',
    confirm: 'ยืนยัน & ออกใบจอง',
    reject: 'ปฏิเสธ',
    none: 'ไม่มีคำขอใหม่',
    footnote: 'เบอร์ผู้จองถูกซ่อนบางส่วน จะเปิดเผยเต็มหลังผู้เช่าชำระเงินเรียบร้อย',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Booking Requests',
    pendingCount: (n: number) => `${n} pending · Confirm to auto-issue a booking slip`,
    booker: 'Booker',
    phone: 'Phone',
    checkIn: 'Check-in date',
    amount: 'Amount',
    confirm: 'Confirm & issue slip',
    reject: 'Reject',
    none: 'No new requests',
    footnote: "The booker's phone is partly hidden until fully paid",
    dateLocale: 'en-US',
  },
};

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

  async function confirm(id: string) {
    try {
      await apiClient.patch(`/bookings/${id}/confirm`);
      reload();
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    }
  }

  async function reject(id: string) {
    try {
      await apiClient.patch(`/bookings/${id}/reject`);
      reload();
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    }
  }

  const pending = bookings.filter((b) => normalizeStatus(b.status) === 'pending');

  return (
    <div>
      <p className="text-sm text-ink-faint">{t.pendingCount(pending.length)}</p>

      <div className="mt-4 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
        <table className="w-full text-left text-sm">
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
                <td className="p-3 font-medium text-ink-strong">{b.contactName}</td>
                <td className="p-3 font-sans tabular-nums text-ink-subtitle">{b.contactPhone.slice(0, 8)}**-*</td>
                <td className="p-3 text-ink-subtitle">{new Date(b.checkInDate).toLocaleDateString(t.dateLocale)}</td>
                <td className="p-3 font-sans font-semibold tabular-nums">฿{b.amount.toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => confirm(b.id)}
                      className="rounded-lg bg-tenant px-3 py-1.5 text-xs font-semibold text-white hover:bg-tenant-dark"
                    >
                      {t.confirm}
                    </button>
                    <button
                      onClick={() => reject(b.id)}
                      className="rounded-lg bg-danger-tint px-3 py-1.5 text-xs font-semibold text-danger"
                    >
                      {t.reject}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pending.length === 0 && <p className="p-4 text-ink-faint">{t.none}</p>}
      </div>

      <p className="mt-3 text-xs text-ink-faint">{t.footnote}</p>
    </div>
  );
}
