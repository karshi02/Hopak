'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { Booking } from '@hopak/shared';

const STEPS = ['pending', 'confirmed', 'paid', 'completed'] as const;
const STEP_LABEL: Record<string, string> = {
  pending: 'ส่งคำขอจอง',
  confirmed: 'เจ้าของหอยืนยัน',
  paid: 'ชำระเงินแล้ว',
  completed: 'เสร็จสิ้น',
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking);
  }, [id]);

  async function handleCancel() {
    await apiClient.patch(`/bookings/${id}/cancel`);
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking);
  }

  async function handlePay() {
    await apiClient.post(`/bookings/${id}/payment`, { method: 'promptpay' });
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking);
  }

  if (!booking) return <main className="p-6">กำลังโหลด...</main>;

  const currentIndex = STEPS.indexOf(booking.status as (typeof STEPS)[number]);
  const canCancel = new Date() <= new Date(booking.cancelDeadline) && booking.status !== 'cancelled';

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold">รายละเอียดการจอง</h1>

      <ol className="mt-4 flex flex-col gap-2">
        {STEPS.map((step, i) => (
          <li key={step} className={i <= currentIndex ? 'font-medium text-green-700' : 'text-gray-400'}>
            {STEP_LABEL[step]}
          </li>
        ))}
      </ol>

      <div className="mt-6 flex gap-3">
        {booking.status === 'confirmed' && (
          <button onClick={handlePay} className="rounded bg-green-600 px-4 py-2 text-white">
            ชำระเงิน
          </button>
        )}
        {canCancel && (
          <button onClick={handleCancel} className="rounded border border-red-500 px-4 py-2 text-red-600">
            ยกเลิกการจอง
          </button>
        )}
      </div>
    </main>
  );
}
