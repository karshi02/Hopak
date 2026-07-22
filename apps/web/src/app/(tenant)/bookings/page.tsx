'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBookings } from '@/hooks/useBookings';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import { PageLoader } from '@/components/PageLoader';
import { getToken } from '@/lib/auth';

const TEXT = {
  th: {
    title: 'รายการจองของฉัน',
    statusLabel: {
      pending: 'รอเจ้าของหอยืนยัน',
      confirmed: 'ยืนยันแล้ว รอชำระเงิน',
      paid: 'ชำระเงินแล้ว',
      cancelled: 'ยกเลิกแล้ว',
      completed: 'เสร็จสิ้น',
    } as Record<string, string>,
    checkIn: 'วันเข้าอยู่',
    none: 'ยังไม่มีการจอง',
  },
  en: {
    title: 'My Bookings',
    statusLabel: {
      pending: 'Awaiting owner confirmation',
      confirmed: 'Confirmed, awaiting payment',
      paid: 'Paid',
      cancelled: 'Cancelled',
      completed: 'Completed',
    } as Record<string, string>,
    checkIn: 'Check-in date',
    none: 'No bookings yet',
  },
};

export default function BookingsPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const { bookings, loading } = useBookings();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold text-[#0b0b0b] dark:text-white">{t.title}</h1>
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
                {t.statusLabel[normalizeStatus(b.status)]}
              </p>
              <p className="text-sm text-[#898781]">{t.checkIn}: {b.checkInDate}</p>
            </Link>
          ))}
          {bookings.length === 0 && <p className="text-[#898781]">{t.none}</p>}
        </div>
      )}
    </main>
  );
}
