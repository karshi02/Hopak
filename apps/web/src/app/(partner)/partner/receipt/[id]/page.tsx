'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Receipt } from '@/components/Receipt';
import { PageLoader } from '@/components/PageLoader';
import type { Booking } from '@hopak/shared';

// ใบจอง ฉบับเจ้าของหอ — API strip checkInToken ออก (ไม่ใช่เจ้าของการจอง) → ไม่มีส่วนรหัสยืนยัน
// ผู้เช่าเอาฉบับตัวเอง (มีรหัส) มายื่นให้เจ้าของกรอกยืนยันตอนเข้าพัก
export default function OwnerReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking).catch(() => setError(true));
  }, [id]);

  if (error) return <p className="p-6 text-ink-faint">ไม่พบใบจอง</p>;
  if (!booking) return <PageLoader />;
  return <Receipt booking={booking} />;
}
