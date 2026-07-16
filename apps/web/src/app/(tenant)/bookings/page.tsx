'use client';

import Link from 'next/link';
import { useBookings } from '@/hooks/useBookings';

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอเจ้าของหอยืนยัน',
  confirmed: 'ยืนยันแล้ว รอชำระเงิน',
  paid: 'ชำระเงินแล้ว',
  cancelled: 'ยกเลิกแล้ว',
  completed: 'เสร็จสิ้น',
};

export default function BookingsPage() {
  const { bookings, loading } = useBookings();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold">รายการจองของฉัน</h1>
      {loading ? (
        <p className="mt-4 text-gray-500">กำลังโหลด...</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {bookings.map((b) => (
            <Link key={b.id} href={`/bookings/${b.id}`} className="block rounded border p-4">
              <p className="font-medium">{STATUS_LABEL[b.status]}</p>
              <p className="text-sm text-gray-600">วันเข้าอยู่: {b.checkInDate}</p>
            </Link>
          ))}
          {bookings.length === 0 && <p className="text-gray-500">ยังไม่มีการจอง</p>}
        </div>
      )}
    </main>
  );
}
