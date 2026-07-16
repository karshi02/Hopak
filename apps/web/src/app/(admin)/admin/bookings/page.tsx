'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Booking } from '@hopak/shared';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    apiClient.get<Booking[]>('/bookings').then(setBookings);
  }, []);

  const filtered = statusFilter ? bookings.filter((b) => b.status === statusFilter) : bookings;

  return (
    <div>
      <h1 className="text-xl font-bold">การจองทั้งหมด</h1>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="mt-4 rounded border px-3 py-2"
      >
        <option value="">ทุกสถานะ</option>
        <option value="pending">รอยืนยัน</option>
        <option value="confirmed">ยืนยันแล้ว</option>
        <option value="paid">ชำระเงินแล้ว</option>
        <option value="cancelled">ยกเลิก</option>
        <option value="completed">เสร็จสิ้น</option>
      </select>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr>
            <th className="p-2">ผู้จอง</th>
            <th className="p-2">สถานะ</th>
            <th className="p-2">ยอดเงิน</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="p-2">{b.contactName}</td>
              <td className="p-2">{b.status}</td>
              <td className="p-2">{b.amount} ฿</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
