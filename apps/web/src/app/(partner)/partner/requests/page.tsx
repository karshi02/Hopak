'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
import type { Booking } from '@hopak/shared';

export default function PartnerRequestsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    apiClient.get<Booking[]>('/bookings').then(setBookings);

    const socket = getSocket();
    socket.on('booking:new', (booking: Booking) => {
      setBookings((prev) => [booking, ...prev]);
    });
    return () => {
      socket.off('booking:new');
    };
  }, []);

  async function confirm(id: string) {
    await apiClient.patch(`/bookings/${id}/confirm`);
    apiClient.get<Booking[]>('/bookings').then(setBookings);
  }

  return (
    <div>
      <h1 className="text-xl font-bold">คำขอจอง</h1>
      <div className="mt-4 flex flex-col gap-2">
        {bookings
          .filter((b) => b.status === 'pending')
          .map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded border p-3">
              <span>
                {b.contactName} — {b.contactPhone.slice(0, 8)}**-*
              </span>
              <button onClick={() => confirm(b.id)} className="rounded bg-green-600 px-3 py-1 text-white">
                ยืนยัน
              </button>
            </div>
          ))}
        {bookings.filter((b) => b.status === 'pending').length === 0 && (
          <p className="text-gray-500">ไม่มีคำขอใหม่</p>
        )}
      </div>
    </div>
  );
}
