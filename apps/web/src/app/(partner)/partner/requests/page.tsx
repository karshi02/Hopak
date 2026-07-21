'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
import { normalizeStatus } from '@/lib/normalize';
import type { Booking } from '@hopak/shared';

export default function PartnerRequestsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  function reload() {
    apiClient.get<Booking[]>('/bookings').then(setBookings);
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
    await apiClient.patch(`/bookings/${id}/confirm`);
    reload();
  }

  async function reject(id: string) {
    await apiClient.patch(`/bookings/${id}/reject`);
    reload();
  }

  const pending = bookings.filter((b) => normalizeStatus(b.status) === 'pending');

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">คำขอจอง</h1>
      <p className="mt-1 text-sm text-ink-faint">รอยืนยัน {pending.length} รายการ · กดยืนยันเพื่อออกใบจองอัตโนมัติ</p>

      <div className="mt-4 overflow-x-auto rounded-card border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">ผู้จอง</th>
              <th className="p-3 font-normal">เบอร์โทร</th>
              <th className="p-3 font-normal">วันเข้าอยู่</th>
              <th className="p-3 font-normal">ยอด</th>
              <th className="p-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((b) => (
              <tr key={b.id} className="border-t border-card-border dark:border-white/10">
                <td className="p-3 font-medium text-ink-strong dark:text-white">{b.contactName}</td>
                <td className="p-3 font-sans tabular-nums text-ink-subtitle">{b.contactPhone.slice(0, 8)}**-*</td>
                <td className="p-3 text-ink-subtitle">{new Date(b.checkInDate).toLocaleDateString('th-TH')}</td>
                <td className="p-3 font-sans font-semibold tabular-nums">฿{b.amount.toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => confirm(b.id)}
                      className="rounded-lg bg-seller px-3 py-1.5 text-xs font-semibold text-white hover:bg-seller-dark"
                    >
                      ยืนยัน &amp; ออกใบจอง
                    </button>
                    <button
                      onClick={() => reject(b.id)}
                      className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger"
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pending.length === 0 && <p className="p-4 text-ink-faint">ไม่มีคำขอใหม่</p>}
      </div>

      <p className="mt-3 text-xs text-ink-faint">เบอร์ผู้จองถูกซ่อนบางส่วน จะเปิดเผยเต็มหลังผู้เช่าชำระเงินเรียบร้อย</p>
    </div>
  );
}
