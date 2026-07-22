'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBookings } from '@/hooks/useBookings';
import { normalizeStatus } from '@/lib/normalize';
import { PageLoader } from '@/components/PageLoader';
import { getToken } from '@/lib/auth';

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอเจ้าของหอยืนยัน',
  confirmed: 'ยืนยันแล้ว รอชำระเงิน',
  paid: 'ชำระเงินแล้ว',
  cancelled: 'ยกเลิกแล้ว',
  completed: 'เสร็จสิ้น',
};

export default function BookingsPage() {
  const router = useRouter();
  const { bookings, loading } = useBookings();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold text-[#0b0b0b] dark:text-white">รายการจองของฉัน</h1>
      {loading ? (
        <PageLoader />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="block rounded-lg border border-black/10 p-4 hover:shadow dark:border-white/10"
            >
              <p className="font-medium text-[#0b0b0b] dark:text-white">
                {STATUS_LABEL[normalizeStatus(b.status)]}
              </p>
              <p className="text-sm text-[#898781]">วันเข้าอยู่: {b.checkInDate}</p>
            </Link>
          ))}
          {bookings.length === 0 && <p className="text-[#898781]">ยังไม่มีการจอง</p>}
        </div>
      )}
    </main>
  );
}
