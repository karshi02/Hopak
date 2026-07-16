'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Booking } from '@hopak/shared';

export default function PartnerSlipsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    apiClient.get<Booking[]>('/bookings').then((data) =>
      setBookings(data.filter((b) => b.status === 'paid' || b.status === 'completed')),
    );
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold">ใบจองรายวัน</h1>
      <div className="mt-4 flex flex-col gap-2">
        {bookings.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded border p-3">
            <span>{b.contactName} — วันเข้าอยู่ {b.checkInDate}</span>
            <a href={`/api/documents/booking-slip/${b.id}`} className="text-green-700 underline">
              ปริ้น PDF
            </a>
          </div>
        ))}
        {bookings.length === 0 && <p className="text-gray-500">ไม่มีใบจองวันนี้</p>}
      </div>
    </div>
  );
}
