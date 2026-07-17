'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import type { Booking } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

const STEPS =['pending', 'confirmed', 'paid', 'completed'] as const;
const STEP_LABEL: Record<string, string> = {
  pending: 'ส่งคำขอจอง',
  confirmed: 'เจ้าของหอยืนยัน',
  paid: 'ชำระเงินแล้ว',
  completed: 'เสร็จสิ้น',
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking);
  }, [id]);

  async function handleCancel() {
    await apiClient.patch(`/bookings/${id}/cancel`);
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking);
  }

  if (!booking) return <PageLoader fullScreen />;

  const status = normalizeStatus(booking.status);
  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);
  const canCancel = new Date() <= new Date(booking.cancelDeadline) && status !== 'cancelled';

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold text-[#0b0b0b] dark:text-white">รายละเอียดการจอง</h1>

      <ol className="mt-4 flex flex-col gap-2">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className={i <= currentIndex ? 'font-medium text-green-700 dark:text-green-400' : 'text-[#898781]'}
          >
            {STEP_LABEL[step]}
          </li>
        ))}
      </ol>

      <div className="mt-6 flex gap-3">
        {status === 'confirmed' && (
          <button
            onClick={() => router.push(`/bookings/${id}/pay`)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            ชำระเงิน
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-600"
          >
            ยกเลิกการจอง
          </button>
        )}
      </div>
    </main>
  );
}
